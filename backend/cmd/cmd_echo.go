package cmd

import (
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdEcho struct{}

func (CmdEcho) Identifier() string {
	return "echo"
}

func (CmdEcho) Run(args []string, in, out chan types.WebSocketMessage, env map[string]string, stopChannel chan struct{}, ClientID, CommandMsgID string, auth_status types.AuthorizationStatus) int {
	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		MessageType: types.MsgOpenStdOut,
		RefID:       CommandMsgID,
	}

	out_string := strings.Join(args[1:], " ")
	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		RefID:       CommandMsgID,
		MessageType: types.MsgOutputStream,

		OutputStream: out_string,
	}

	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		RefID:       CommandMsgID,
		MessageType: types.MsgCloseStdout,
	}

	return 0
}
