package cmd

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/chatbot"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/influx"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/reversed_rpc"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/sourcegraph/jsonrpc2"
	"github.com/vmihailenco/msgpack/v5"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for dev
	},
}

func CmdWebhook(filestore filesystem.Store, sessionStore *types.SessionStore, apiKey chatbot.APIKey, jsonConn *jsonrpc2.Conn, mqttEvents *util.EventHandler[types.MQTTMessage], flux_cfg *influx.InfluxDBConfig, registry *reversed_rpc.RPCRegistry) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth_get, ok := c.Get("auth")
		if !ok {
			log.Println("missing auth middleware")
			c.Status(401)
			return
		}
		auth_status := auth_get.(types.AuthorizationStatus)
		socketID := util.RandHex(20)
		session := sessionStore.AttachSession(socketID, auth_status)
		available_commands := InitCommands(filestore, filesystem.FSContext{
			Store:    filestore,
			UserTags: auth_status.Tags,
		}, session, sessionStore, apiKey, jsonConn, mqttEvents, flux_cfg, registry)

		clients := map[string]types.ClientInfo{}
		client_cancels := map[string]context.CancelFunc{}
		client_inputs := map[string]*types.UnboundedChan[types.WebSocketMessage]{}

		wg := new(sync.WaitGroup)

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("Upgrade failed:", err)
			sessionStore.DetachSession(socketID)
			return
		}
		defer conn.Close()

		sess_ch := make(chan struct{})
		in_ch := make(chan types.WebSocketMessage)
		out_ch := make(chan types.WebSocketMessage)
		defer func() {
			for clientID, cancel := range client_cancels {
				go func() {
					for range clients[clientID].Client.Out {
					}
				}()
				log.Printf("Canceling client ctx during exit (%q)", clientID)
				client_inputs[clientID].Close()
				cancel()
			}

			wg.Wait()
			sessionStore.DetachSession(socketID)
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
					messageID := util.RandHex(20)
					out_ch <- types.WebSocketMessage{
						MessageID:   messageID,
						MessageType: types.MsgErrResponse,
						Error:       "expected binary message",
					}
					continue
				}

				var ws_message types.WebSocketMessage
				if err := msgpack.Unmarshal([]byte(msg), &ws_message); err != nil {
					messageID := util.RandHex(20)
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
				messageID := util.RandHex(20)
				if _, ok := clients[incoming.ClientID]; !ok {
					if incoming.MessageType == types.MsgConnect {
						client_map := make(map[string]string)
						if incoming.SetEnv != nil {
							client_map = incoming.SetEnv
						}
						client_map["PWD"] = fmt.Sprintf("/home/%s", auth_status.Username)
						client_map["HOME"] = fmt.Sprintf("/home/%s", auth_status.Username)

						unboundedChan := types.NewUnboundedChan[types.WebSocketMessage]()
						ctx, cancel := context.WithCancel(c.Request.Context())
						new_client := types.ClientInfo{
							Client: types.Client{
								ClientID:   incoming.ClientID,
								Env:        client_map,
								In:         unboundedChan.Out(),
								Out:        out_ch,
								AuthStatus: auth_status,
								UserTags:   auth_status.Tags,
							},
							Ctx:          ctx,
							ClientHandle: session.ClientConnected(incoming.ClientID),
						}
						clients[incoming.ClientID] = new_client
						client_cancels[incoming.ClientID] = cancel
						client_inputs[incoming.ClientID] = unboundedChan

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
						go RunClient(new_client, available_commands, filestore, wg)
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
						client_in := client_inputs[incoming.ClientID].In()
						client_in <- incoming
						close(client_in)
						client_cancels[incoming.ClientID]()
						delete(clients, incoming.ClientID)
						delete(client_cancels, incoming.ClientID)
						delete(client_inputs, incoming.ClientID)
					} else {
						client_inputs[incoming.ClientID].In() <- incoming
					}
				}
			}
		}
	}
}
