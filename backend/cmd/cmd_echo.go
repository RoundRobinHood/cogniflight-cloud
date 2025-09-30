package cmd

import (
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdEcho struct{}

func (CmdEcho) Identifier() string {
	return "echo"
}

func (CmdEcho) Run(ctx types.CommandContext) int {
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		MessageType: types.MsgOpenStdOut,
		RefID:       ctx.CommandMsgID,
	}

	out_string := strings.Join(ctx.Args[1:], " ")
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgOutputStream,

		OutputStream: out_string,
	}

	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgCloseStdout,
	}

	return 0
}
