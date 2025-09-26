package cmd

import (
	"fmt"
	"io"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdCat struct {
	FileStore filesystem.Store
}

func (*CmdCat) Identifier() string {
	return "cat"
}

func (c *CmdCat) Run(ctx types.CommandContext) int {
	if len(ctx.Args) > 1 {
		ctx.Out <- types.WebSocketMessage{
			MessageID:   GenerateMessageID(20),
			ClientID:    ctx.ClientID,
			MessageType: types.MsgOpenStdOut,
			RefID:       ctx.CommandMsgID,
		}
		defer func() {
			ctx.Out <- types.WebSocketMessage{
				MessageID:   GenerateMessageID(20),
				ClientID:    ctx.ClientID,
				MessageType: types.MsgCloseStdout,
				RefID:       ctx.CommandMsgID,
			}
		}()

		files := ctx.Args[1:]
		for i, filepath := range files {
			abs_path, err := filesystem.AbsPath("/", filepath)
			if err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): invalid filepath: %v", i, err)}
				return CmdError{}.Run(error_ctx)
			}

			if node, err := c.FileStore.Lookup(ctx.Ctx, ctx.ParentTags, abs_path); err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): couldnt lookup file: %v", i, err)}
				return CmdError{}.Run(error_ctx)
			} else {
				if stream, err := c.FileStore.ReadFileObj(ctx.Ctx, *node, ctx.ParentTags); err != nil {
					error_ctx := ctx
					error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): couldnt open file for reading: %v", i, err)}
					return CmdError{}.Run(error_ctx)
				} else {
					io.Copy(&OutputWriter{Ctx: ctx, StreamType: types.MsgOutputStream}, stream)
					stream.Close()
				}
			}

			ctx.Out <- types.WebSocketMessage{
				MessageID:   GenerateMessageID(20),
				ClientID:    ctx.ClientID,
				MessageType: types.MsgOutputStream,
				RefID:       ctx.CommandMsgID,

				OutputStream: "\r\n",
			}
		}
		return 0
	}

	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		MessageType: types.MsgOpenStdin,
		RefID:       ctx.CommandMsgID,
	}
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		MessageType: types.MsgOpenStdOut,
		RefID:       ctx.CommandMsgID,
	}
	stdinOpen, stdoutOpen := true, true

	for {
		select {
		case incoming := <-ctx.In:
			switch incoming.MessageType {
			case types.MsgInputStream:
				ctx.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ctx.ClientID,
					MessageType: types.MsgOutputStream,
					RefID:       ctx.CommandMsgID,

					OutputStream: incoming.InputStream,
				}
			case types.MsgInputEOF:
				stdinOpen = false
				ctx.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ctx.ClientID,
					MessageType: types.MsgCloseStdout,
					RefID:       ctx.CommandMsgID,
				}
				stdoutOpen = false
				return 0
			}
		case <-ctx.Ctx.Done():
			if stdinOpen {
				ctx.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ctx.ClientID,
					MessageType: types.MsgCloseStdin,
					RefID:       ctx.CommandMsgID,
				}
			}
			if stdoutOpen {
				ctx.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ctx.ClientID,
					MessageType: types.MsgCloseStdout,
					RefID:       ctx.CommandMsgID,
				}
			}
			return 0
		}
	}
}
