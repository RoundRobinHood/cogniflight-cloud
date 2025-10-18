package cmd

import (
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

func NormCRLF(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "\r\n", "\n"), "\n", "\r\n")
}

func CRLFChannel(ch chan types.WebSocketMessage) chan types.WebSocketMessage {
	in := make(chan types.WebSocketMessage)

	go func() {
		for incoming := range in {
			switch incoming.MessageType {
			case types.MsgInputStream:
				incoming.InputStream = NormCRLF(incoming.InputStream)
			case types.MsgOutputStream:
				incoming.OutputStream = NormCRLF(incoming.OutputStream)
			case types.MsgErrorStream:
				incoming.ErrorStream = NormCRLF(incoming.ErrorStream)
			}

			ch <- incoming
		}
	}()

	return in
}
