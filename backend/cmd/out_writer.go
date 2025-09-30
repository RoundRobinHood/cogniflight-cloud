package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type OutputWriter struct {
	Ctx        types.CommandContext
	StreamType types.MessageType
}

func (o *OutputWriter) Write(p []byte) (int, error) {
	switch o.StreamType {
	case types.MsgOutputStream:
		o.Ctx.Out <- types.WebSocketMessage{
			MessageID:   GenerateMessageID(20),
			ClientID:    o.Ctx.ClientID,
			MessageType: types.MsgOutputStream,
			RefID:       o.Ctx.CommandMsgID,

			OutputStream: string(p),
		}
		return len(p), nil
	case types.MsgErrorStream:
		o.Ctx.Out <- types.WebSocketMessage{
			MessageID:   GenerateMessageID(20),
			ClientID:    o.Ctx.ClientID,
			MessageType: types.MsgErrorStream,
			RefID:       o.Ctx.CommandMsgID,

			ErrorStream: string(p),
		}
		return len(p), nil
	default:
		return 0, fmt.Errorf("error: invalid stream type (%q)", o.StreamType)
	}
}
