package client

import (
	"context"
	"fmt"
	"io"
	"log"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
)

type SocketSession struct {
	connection *websocket.Conn
	clients    map[string]SocketClient
	ctx        context.Context
	cancel     context.CancelFunc
	wg         *sync.WaitGroup
	mu         *sync.RWMutex
}

type SocketClient struct {
	clientID  string
	input     *util.EventHandler[types.WebSocketMessage]
	out_ch    *types.UnboundedChan[types.WebSocketMessage]
	ctx       context.Context
	cancel    context.CancelFunc
	commandMu *sync.Mutex
}

func (s *SocketSession) ConnectClient(clientID string) (SocketClient, error) {
	input := util.NewEventHandler[types.WebSocketMessage]()
	out_ch := types.NewUnboundedChan[types.WebSocketMessage]()
	ctx, cancel := context.WithCancel(context.Background())
	commandMu := new(sync.Mutex)
	client := SocketClient{
		clientID:  clientID,
		input:     input,
		out_ch:    out_ch,
		ctx:       ctx,
		cancel:    cancel,
		commandMu: commandMu,
	}

	func() {
		s.mu.Lock()
		defer s.mu.Unlock()

		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case msg := <-out_ch.Out():
					bytes, err := msgpack.Marshal(msg)
					if err != nil {
						log.Println("Can't marshal message to server:", err)
						cancel()
						return
					}
					if err := s.connection.WriteMessage(websocket.BinaryMessage, bytes); err != nil {
						log.Println("Can't write to socket connection:", err)
						cancel()
						return
					}
				}
			}
		}()

		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			<-ctx.Done()
			commandMu.Lock()
			defer commandMu.Unlock()
			out_ch.Close()
			input.Close()
		}()

		s.clients[clientID] = client
	}()

	client.out_ch.In() <- types.WebSocketMessage{
		MessageID:   util.RandHex(20),
		ClientID:    clientID,
		MessageType: types.MsgConnect,
	}

	listener := input.Subscribe()
	msg := <-listener.Out()
	defer listener.Unsubscribe()

	if msg.MessageType != types.MsgConnectAck {
		log.Println("Invalid connect msg: ", msg)
		cancel()
		return client, fmt.Errorf("invalid connect msg: %v", msg)
	}

	return client, nil
}

func (c SocketClient) Disconnect(ctx context.Context) error {
	listener := c.input.Subscribe()
	defer listener.Unsubscribe()

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	go func() {
		select {
		case <-ctx.Done():
		case <-c.ctx.Done():
			cancel()
		}
	}()

	c.out_ch.In() <- types.WebSocketMessage{
		MessageID:   util.RandHex(20),
		ClientID:    c.clientID,
		MessageType: types.MsgDisconnect,
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg, ok := <-listener.Out():
			if !ok {
				return fmt.Errorf("error: ran out of input before disconnectAck")
			}
			if msg.MessageType == types.MsgDisconnectAck {
				return nil
			}
		}
	}
}

type CommandOptions struct {
	Command        string
	Stdin          io.Reader
	Stdout, Stderr io.Writer
}

// Note: to avoid resource leakage, make sure the stdin reader can stop from a blocking read after RunCommand is finished
func (c SocketClient) RunCommand(ctx context.Context, opt CommandOptions) (int, error) {
	c.commandMu.Lock()
	defer c.commandMu.Unlock()

	listener := c.input.Subscribe()
	defer listener.Unsubscribe()
	in_ch := listener.Out()

	ctx, cancel := context.WithCancel(ctx)
	go func() {
		select {
		case <-ctx.Done():
		case <-c.ctx.Done():
			cancel()
		}
	}()

	defer cancel()

	c.out_ch.In() <- types.WebSocketMessage{
		MessageID:   util.RandHex(20),
		ClientID:    c.clientID,
		MessageType: types.MsgRunCommand,
		Command:     opt.Command,
	}

	for haveRunning := false; !haveRunning; {
		select {
		case <-ctx.Done():
			return 0, fmt.Errorf("ctx err while waiting on command_running msg: %w", ctx.Err())
		case msg := <-in_ch:
			if msg.MessageType == types.MsgCommandRunning {
				haveRunning = true
			}
		}
	}

	wg := new(sync.WaitGroup)

	stdin_ch := make(chan string)
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer func() {
			close(stdin_ch)
		}()
		buf := make([]byte, 200)
		for {
			if ctx.Err() != nil {
				return
			}

			n, err := opt.Stdin.Read(buf)
			if n > 0 {
				stdin_ch <- string(buf[:n])
			}

			if err != nil {
				if err != io.EOF {
					log.Println("Read err: ", err)
				}
				return
			}
		}
	}()

	stdout_writer := types.NewUnboundedChan[string]()
	wg.Add(1)
	go func() {
		defer wg.Done()
		hadError := false
		for msg := range stdout_writer.Out() {
			if !hadError {
				if _, err := opt.Stdout.Write([]byte(msg)); err != nil {
					log.Println("Stdout write error: ", err)
					hadError = true
				}
			}
		}
	}()

	stderr_writer := types.NewUnboundedChan[string]()
	wg.Add(1)
	go func() {
		defer wg.Done()
		hadError := false
		for msg := range stderr_writer.Out() {
			if !hadError {
				if _, err := opt.Stderr.Write([]byte(msg)); err != nil {
					log.Println("Stderr write error: ", err)
					hadError = true
				}
			}
		}
	}()

	for {
		select {
		case msg, ok := <-stdin_ch:
			if !ok {
				c.out_ch.In() <- types.WebSocketMessage{
					MessageID:   util.RandHex(20),
					ClientID:    c.clientID,
					MessageType: types.MsgInputEOF,
				}
				stdin_ch = nil
				continue
			}
			c.out_ch.In() <- types.WebSocketMessage{
				MessageID:   util.RandHex(20),
				ClientID:    c.clientID,
				MessageType: types.MsgInputStream,

				InputStream: msg,
			}
		case msg := <-in_ch:
			switch msg.MessageType {
			case types.MsgOutputStream:
				stdout_writer.In() <- msg.OutputStream
			case types.MsgErrorStream:
				stderr_writer.In() <- msg.ErrorStream
			case types.MsgCommandFinished:
				cancel()
				stdout_writer.Close()
				stderr_writer.Close()
				go func() {
					if stdin_ch != nil {
						for range stdin_ch {
						}
					}
				}()
				wg.Wait()
				return *msg.CommandResult, nil
			}
		}
	}
}
