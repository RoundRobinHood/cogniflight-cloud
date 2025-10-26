package reversed_rpc

import (
	"context"
	"log"
	"net/http"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for dev
	},
}

func RPCWebhook(registry *RPCRegistry) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth_get, ok := c.Get("auth")
		if !ok {
			log.Println("missing auth middleware")
			c.Status(401)
			return
		}

		auth_status := auth_get.(types.AuthorizationStatus)
		ctx, cancel := context.WithCancel(c.Request.Context())
		defer cancel()
		sendingChannel := types.NewUnboundedChan[types.WebSocketMessage]()

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("Upgrade failed: ", err)
			return
		}
		defer conn.Close()

		registry.AddRPCConn(auth_status.Username, conn, sendingChannel)
		defer registry.RemoveRPCConn(auth_status.Username)

		go func() {
			for {
				select {
				case outgoing := <-sendingChannel.Out():
					bytes, err := msgpack.Marshal(outgoing)
					if err != nil {
						log.Fatal("Can't marshal msgpack: ", err)
					}
					if err := conn.WriteMessage(websocket.BinaryMessage, bytes); err != nil {
						log.Println("Write error: ", err)
						cancel()
						return
					}
				case <-ctx.Done():
					return
				}
			}
		}()

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}
			if messageType, msg, err := conn.ReadMessage(); err != nil {
				log.Println("Read error: ", err)
				return
			} else if messageType != websocket.BinaryMessage {
				log.Println("Got a non-binary websocket message: ", string(msg))
				return
			} else {
				var incoming types.WebSocketMessage
				if err := msgpack.Unmarshal(msg, &incoming); err != nil {
					log.Fatal("Failed to unmarshal: ", err)
				}
				registry.eventHandler.Emit(incoming)
			}
		}
	}
}
