package cmd

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
)

func GenerateMessageID(size int) string {
	hex := "0123456789abcdef"
	output := strings.Builder{}
	output.Grow(size)

	for range size {
		output.WriteByte(hex[rand.Intn(15)])
	}

	return output.String()
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for dev
	},
}

func CmdWebhook(filestore filesystem.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth_get, ok := c.Get("auth")
		if !ok {
			log.Println("missing auth middleware")
			c.Status(401)
			return
		}
		auth_status := auth_get.(types.AuthorizationStatus)
		available_commands := InitCommands(filestore)

		clients := map[string]types.ClientInfo{}
		client_cancels := map[string]context.CancelFunc{}
		wg := new(sync.WaitGroup)

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("Upgrade failed:", err)
			return
		}
		defer conn.Close()

		sess_ch := make(chan struct{})
		in_ch := make(chan types.WebSocketMessage)
		out_ch := make(chan types.WebSocketMessage)
		defer func() {
			for _, cancel := range client_cancels {
				cancel()
			}
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-sess_ch:
					return
				default:
				}

				messageType, msg, err := conn.ReadMessage()
				if err != nil {
					log.Println("read error:", err)
					close(in_ch)
					break
				}
				if messageType != websocket.BinaryMessage {
					messageID := GenerateMessageID(20)
					out_ch <- types.WebSocketMessage{
						MessageID:   messageID,
						MessageType: types.MsgErrResponse,
						Error:       "expected binary message",
					}
					continue
				}

				var ws_message types.WebSocketMessage
				if err := msgpack.Unmarshal([]byte(msg), &ws_message); err != nil {
					messageID := GenerateMessageID(20)
					out_ch <- types.WebSocketMessage{
						MessageID:   messageID,
						MessageType: types.MsgErrResponse,
						Error:       fmt.Sprintf("invalid messagepack: %q", err),
					}
					continue
				}

				in_ch <- ws_message
			}
		}()

		for {
			select {
			case outgoing := <-out_ch:
				bytes, _ := msgpack.Marshal(outgoing)
				err = conn.WriteMessage(websocket.BinaryMessage, bytes)
				if err != nil {
					log.Println("write error:", err)
					close(sess_ch)
					return
				}
			case incoming, ok := <-in_ch:
				if !ok {
					log.Println("in channel closed")
					close(sess_ch)
					return
				}
				messageID := GenerateMessageID(20)
				if client, ok := clients[incoming.ClientID]; !ok {
					if incoming.MessageType == types.MsgConnect {
						client_map := make(map[string]string)
						if incoming.SetEnv != nil {
							client_map = incoming.SetEnv
						}

						ctx, cancel := context.WithCancel(c.Request.Context())
						new_client := types.ClientInfo{
							Client: types.Client{
								ClientID:   incoming.ClientID,
								Env:        client_map,
								In:         make(chan types.WebSocketMessage),
								Out:        out_ch,
								AuthStatus: auth_status,
							},
							Ctx:            ctx,
							InputWaitGroup: new(sync.WaitGroup),
						}
						clients[incoming.ClientID] = new_client
						client_cancels[incoming.ClientID] = cancel

						wg.Add(1)
						go func() {
							defer wg.Done()
							out_ch <- types.WebSocketMessage{
								MessageID:   messageID,
								ClientID:    incoming.ClientID,
								MessageType: types.MsgConnectAck,
								RefID:       incoming.MessageID,
							}
						}()

						wg.Add(1)
						go RunClient(new_client, available_commands, wg)
					} else {

						wg.Add(1)
						go func() {
							defer wg.Done()
							out_ch <- types.WebSocketMessage{
								MessageID:   messageID,
								MessageType: types.MsgErrResponse,
								RefID:       incoming.MessageID,
								Error:       "invalid client_id: client does not exist",
							}
						}()
					}
				} else {
					if incoming.MessageType == types.MsgDisconnect {
						client.InputWaitGroup.Add(1)
						go func(cancel context.CancelFunc) {
							defer client.InputWaitGroup.Done()
							client.Client.In <- incoming
							cancel()
						}(client_cancels[incoming.ClientID])
						delete(clients, incoming.ClientID)
						delete(client_cancels, incoming.ClientID)
					} else {
						client.InputWaitGroup.Add(1)
						go func() {
							defer client.InputWaitGroup.Done()
							log.Printf("[system] - sending msg to client %q", client.Client.ClientID)
							client.Client.In <- incoming
							log.Printf("[system] - finished sending msg to client %q", client.Client.ClientID)
						}()
					}
				}
			}
		}
	}
}
