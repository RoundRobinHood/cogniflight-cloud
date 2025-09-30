package cmd

import (
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdError struct{}

func (CmdError) Identifier() string {
	return "error"
}

func (CmdError) Run(ctx types.CommandContext) int {
	err_string := strings.Join(ctx.Args[1:], " ")
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgOpenStderr,
	}
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgErrorStream,

		ErrorStream: err_string,
	}
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgCloseStderr,
	}

	return 1
}
