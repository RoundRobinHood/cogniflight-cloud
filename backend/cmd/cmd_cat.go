package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdCat struct {
	FileRoot types.FsDirectory
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

			node, err := filesystem.Lookup(ctx.Ctx, c.FileRoot, ctx.ParentTags, abs_path)
			if err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): fetching file: %v", i, err)}
				return CmdError{}.Run(error_ctx)
			}

			if node.NodeType() != types.File {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): is a directory", i)}
				return CmdError{}.Run(error_ctx)
			}

			file := node.(types.FsFile)
			if handle, err := file.GetHandle(ctx.ParentTags); err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error getting file handle: %v", err)}
				return CmdError{}.Run(error_ctx)
			} else {
				out_writer := &OutputWriter{Ctx: ctx, StreamType: types.MsgOutputStream}
				if _, err := handle.WriteTo(out_writer); err != nil {
					error_ctx := ctx
					error_ctx.Args = []string{"error", fmt.Sprintf("error reading from file (arg %d): %v", i, err)}
					return CmdError{}.Run(error_ctx)
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
