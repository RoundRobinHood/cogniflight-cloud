package cmd

import (
	"context"
	"errors"
	"fmt"
	"log"
	"maps"
	"strings"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/sh"
)

func RunClient(info types.ClientInfo, commands []sh.Command, filestore filesystem.Store, wg *sync.WaitGroup) {
	defer log.Printf("[client %q] - closing", info.Client.ClientID)
	defer info.ClientHandle.Disconnected()
	defer wg.Done()

	stdin_log := types.NewUnboundedChan[string]()
	stdout_log := types.NewUnboundedChan[string]()
	stderr_log := types.NewUnboundedChan[string]()

	defer stdin_log.Close()
	defer stdout_log.Close()
	defer stderr_log.Close()

	go func() {
		for in := range stdin_log.Out() {
			info.ClientHandle.Stdin(in)
		}
	}()
	go func() {
		for out := range stdout_log.Out() {
			info.ClientHandle.Stdout(out)
		}
	}()
	go func() {
		for err := range stderr_log.Out() {
			info.ClientHandle.Stderr(err)
		}
	}()

	stdin := &ChannelReader{}
	stdout := make(ChannelWriter)
	defer close(stdout)
	stderr := make(ChannelWriter)
	defer close(stderr)
	runner := &sh.Runner{
		Env:      info.Client.Env,
		Commands: commands,
		Stdin:    stdin,
		Stdout:   stdout,
		Stderr:   stderr,
		FS: &filesystem.FSContext{
			Store:    filestore,
			UserTags: info.Client.UserTags,
		},
	}

	env := map[string]string{}
	maps.Copy(env, info.Client.Env)
	for {
		select {
		case <-info.Ctx.Done():
			fmt.Println("context cancelled")
			var disconnect_msg types.WebSocketMessage
			// NOTE: if context is cancelled, it's expected that the input channel is finalized and will close soon
			for in := range info.Client.In {
				if in.MessageType == types.MsgDisconnect {
					disconnect_msg = in
				}
			}

			if disconnect_msg.MessageID != "" {
				info.Client.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    info.Client.ClientID,
					MessageType: types.MsgDisconnectAck,
					RefID:       disconnect_msg.MessageID,
				}
			}

			return
		case msg := <-info.Client.In:
			log.Printf("[client %q] - received msg: %v", info.Client.ClientID, msg)
			switch msg.MessageType {
			case types.MsgRunCommand:
				info.ClientHandle.CommandRunning(msg.Command)
				cmd_stop := make(chan struct{})
				cmd_wg := new(sync.WaitGroup)
				cmd_wg.Add(3)
				stdin.Chan = make(chan string)
				go func() {
					defer cmd_wg.Done()
					for {
						select {
						case <-cmd_stop:
							return
						case msg := <-info.Client.In:
							switch msg.MessageType {
							case types.MsgInputStream:
								stdin_log.In() <- msg.InputStream
								if msg.InputStream != "" {
									stdin.Chan <- msg.InputStream
								}
							case types.MsgInputEOF:
								close(stdin.Chan)
								return
							}
						}
					}
				}()
				go func() {
					defer cmd_wg.Done()
					for {
						select {
						case <-cmd_stop:
							return
						case str := <-stdout:
							stdout_log.In() <- str
							info.Client.Out <- types.WebSocketMessage{
								MessageID:   GenerateMessageID(20),
								ClientID:    info.Client.ClientID,
								MessageType: types.MsgOutputStream,
								RefID:       msg.MessageID,

								OutputStream: str,
							}
						}
					}
				}()
				go func() {
					defer cmd_wg.Done()
					for {
						select {
						case <-cmd_stop:
							return
						case str := <-stderr:
							stderr_log.In() <- str
							info.Client.Out <- types.WebSocketMessage{
								MessageID:   GenerateMessageID(20),
								ClientID:    info.Client.ClientID,
								MessageType: types.MsgErrorStream,
								RefID:       msg.MessageID,

								ErrorStream: str,
							}
						}
					}
				}()

				cmd_ctx := context.WithValue(info.Ctx, "auth_status", info.Client.AuthStatus)
				cmd_ctx = context.WithValue(cmd_ctx, "tags", info.Client.UserTags)

				info.Client.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    info.Client.ClientID,
					MessageType: types.MsgCommandRunning,
					RefID:       msg.MessageID,
				}
				log.Printf("running cmd: %q", msg.Command)
				err := runner.RunText(cmd_ctx, strings.NewReader(msg.Command))
				close(cmd_stop)
				cmd_wg.Wait()

				result := 0
				if err != nil {
					var exit sh.ExitStatus
					result = 1
					if errors.As(err, &exit) {
						result = int(exit)
					} else {
						log.Printf("Runner error: %v\n", err)
						info.Client.Out <- types.WebSocketMessage{
							MessageID:   GenerateMessageID(20),
							ClientID:    info.Client.ClientID,
							MessageType: types.MsgErrorStream,
							RefID:       msg.MessageID,

							ErrorStream: err.Error(),
						}
					}
				}

				info.ClientHandle.CommandFinished(result)
				info.Client.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    info.Client.ClientID,
					MessageType: types.MsgCommandFinished,
					RefID:       msg.MessageID,

					CommandResult: &result,
				}

			case types.MsgDisconnect:
				go func() {
					for range info.Client.In {
					}
				}()
				info.Client.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    info.Client.ClientID,
					MessageType: types.MsgDisconnectAck,
					RefID:       msg.MessageID,
				}

				log.Printf("[client %q] - sent disconnectAck", msg.ClientID)
				return
			}
		}
	}
}
