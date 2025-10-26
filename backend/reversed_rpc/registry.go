package reversed_rpc

import (
	"context"
	"os"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/gorilla/websocket"
)

type RPCRegistry struct {
	sockets 	map[string]*websocket.Conn
	cancels 	map[string]context.CancelFunc
	ctx     	map[string]context.Context
	sendingChannels map[string]*types.UnboundedChan[types.WebSocketMessage]
	mu 		sync.RWMutex
	eventHandler 	*util.EventHandler[types.WebSocketMessage]
}

func NewRPCRegistry() *RPCRegistry {
	return &RPCRegistry{
		sockets: map[string]*websocket.Conn{},
		cancels: map[string]context.CancelFunc{},
		ctx: map[string]context.Context{},
		sendingChannels: map[string]*types.UnboundedChan[types.WebSocketMessage]{},
		eventHandler: util.NewEventHandler[types.WebSocketMessage](),
	}
}

func (r *RPCRegistry) AddRPCConn(edge_username string, conn *websocket.Conn, sendingChannel *types.UnboundedChan[types.WebSocketMessage]) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.sockets[edge_username]; exists {
		return os.ErrExist
	}

	r.sockets[edge_username] = conn
	r.ctx[edge_username], r.cancels[edge_username] = context.WithCancel(context.Background())
	r.sendingChannels[edge_username] = sendingChannel
	return nil
}

func (r *RPCRegistry) RemoveRPCConn(edge_username string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.sockets[edge_username]; !exists {
		return os.ErrNotExist
	}

	r.cancels[edge_username]()
	delete(r.sockets, edge_username)
	delete(r.ctx, edge_username)
	delete(r.cancels, edge_username)
	delete(r.sendingChannels, edge_username)
	return nil
}

type RPCCallHandle struct {
	EventListener *util.EventListener[types.WebSocketMessage]
	SendingChannel *types.UnboundedChan[types.WebSocketMessage]
	CallID string
	Ctx context.Context
}

func (r *RPCRegistry) Call(edge_username, command string) (*RPCCallHandle, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if sendingChannel, ok := r.sendingChannels[edge_username]; !ok {
		return nil, os.ErrNotExist
	} else {
		callID := util.RandHex(20)
		handler := r.eventHandler
		ctx := r.ctx[edge_username]
		listener := handler.Subscribe()
		sendingChannel.In() <- types.WebSocketMessage{
			MessageID: callID,
			MessageType: types.MsgRunCommand,

			Command: command,
		}
		
		for incoming := range listener.Out() {
			if incoming.RefID == callID && incoming.MessageType == types.MsgCommandRunning {
				return &RPCCallHandle{
					EventListener: listener,
					SendingChannel: sendingChannel,
					CallID: callID,
					Ctx: ctx,
				}, nil
			}
		}
		return nil, os.ErrNotExist
	}
}
