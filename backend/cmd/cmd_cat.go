package cmd

import "github.com/RoundRobinHood/cogniflight-cloud/backend/types"

type CmdCat struct{}

func (CmdCat) Identifier() string {
	return "cat"
}

func (CmdCat) Run(args []string, in, out chan types.WebSocketMessage, env map[string]string, stopChannel chan struct{}, ClientID, CommandMsgID string, auth_status types.AuthorizationStatus) int {
	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		MessageType: types.MsgOpenStdin,
		RefID:       CommandMsgID,
	}
	out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ClientID,
		MessageType: types.MsgOpenStdOut,
		RefID:       CommandMsgID,
	}
	stdinOpen, stdoutOpen := true, true

	for {
		select {
		case incoming := <-in:
			switch incoming.MessageType {
			case types.MsgInputStream:
				out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ClientID,
					MessageType: types.MsgOutputStream,
					RefID:       CommandMsgID,

					OutputStream: incoming.InputStream,
				}
			case types.MsgInputEOF:
				stdinOpen = false
				out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ClientID,
					MessageType: types.MsgCloseStdout,
					RefID:       CommandMsgID,
				}
				stdoutOpen = false
				return 0
			}
		case <-stopChannel:
			if stdinOpen {
				out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ClientID,
					MessageType: types.MsgCloseStdin,
					RefID:       CommandMsgID,
				}
			}
			if stdoutOpen {
				out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ClientID,
					MessageType: types.MsgCloseStdout,
					RefID:       CommandMsgID,
				}
			}
			return 0
		}
	}
}
