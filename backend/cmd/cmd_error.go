package cmd

import (
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdError struct{}

func (CmdError) Identifier() string {
	return "error"
}

func (CmdError) Run(args []string, in, out chan types.WebSocketMessage, env map[string]string, stopChannel chan struct{}, ClientID, CommandMsgID string, auth_status types.AuthorizationStatus) int {
	err_string := strings.Join(args[1:], " ")
	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		RefID:       CommandMsgID,
		MessageType: types.MsgOpenStderr,
	}
	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		RefID:       CommandMsgID,
		MessageType: types.MsgErrorStream,

		ErrorStream: err_string,
	}
	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		RefID:       CommandMsgID,
		MessageType: types.MsgCloseStderr,
	}

	return 1
}
