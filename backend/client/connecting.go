package client

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
)

func Login(loginURL, username, password string) (string, error) {
	body := fmt.Sprintf(`{"username": %q, "password": %q}`, username, password)
	resp, err := http.DefaultClient.Post(loginURL, "application/json", strings.NewReader(body))
	if err != nil {
		return "", err
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("%s", resp.Status)
	}

	var sessID string
	for _, cookie := range resp.Cookies() {
		if cookie.Name == "sessid" {
			sessID = cookie.Value
			break
		}
	}

	if sessID == "" {
		return "", fmt.Errorf("no sessid cookie in response")
	}

	return sessID, nil
}

func ConnectSocket(socketURL, sessID string) (*websocket.Conn, error) {
	header := http.Header{}
	header.Add("Cookie", "sessid="+sessID)

	conn, _, err := websocket.DefaultDialer.Dial(socketURL, header)
	if err != nil {
		return nil, err
	}

	return conn, nil
}

func NewSocketSession(conn *websocket.Conn) *SocketSession {
	wg := new(sync.WaitGroup)
	mu := new(sync.RWMutex)
	ctx, cancel := context.WithCancel(context.Background())
	ret := &SocketSession{
		connection: conn,
		clients:    map[string]SocketClient{},
		ctx:        context.Background(),
		cancel:     cancel,
		wg:         wg,
		mu:         mu,
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			if ctx.Err() != nil {
				return
			}

			messageType, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("read error:", err)
				cancel()
				return
			}
			if messageType != websocket.BinaryMessage {
				log.Println("Received non-binary message:", string(msg))
				cancel()
				return
			}

			var ws_message types.WebSocketMessage
			if err := msgpack.Unmarshal(msg, &ws_message); err != nil {
				log.Println("Can't unmarshal message:", err)
				cancel()
				return
			}

			func() {
				if ws_message.MessageType == types.MsgDisconnectAck {
					mu.Lock()
					defer mu.Unlock()

					if client, ok := ret.clients[ws_message.ClientID]; ok {
						client.input.Emit(ws_message)
						client.input.Close()
						delete(ret.clients, ws_message.ClientID)
					}
					return
				}

				mu.RLock()
				defer mu.RUnlock()

				if client, ok := ret.clients[ws_message.ClientID]; ok {
					client.input.Emit(ws_message)
				}
			}()
		}
	}()

	return ret
}
