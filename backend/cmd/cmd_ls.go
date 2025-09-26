package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdLs struct {
	FileStore filesystem.Store
}

func (*CmdLs) Identifier() string {
	return "ls"
}

func (c *CmdLs) Run(ctx types.CommandContext) int {
	if node, err := c.FileStore.Lookup(ctx.Ctx, ctx.ParentTags, ctx.Args[1]); err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error looking up directory: %v", err)}
		return CmdError{}.Run(error_ctx)
	} else {
		ctx.Out <- types.WebSocketMessage{
			MessageID:   GenerateMessageID(20),
			ClientID:    ctx.ClientID,
			RefID:       ctx.CommandMsgID,
			MessageType: types.MsgOpenStdOut,
		}
		for _, reference := range node.Entries {
			ctx.Out <- types.WebSocketMessage{
				MessageID:   GenerateMessageID(20),
				ClientID:    ctx.ClientID,
				RefID:       ctx.CommandMsgID,
				MessageType: types.MsgOutputStream,

				OutputStream: reference.Name + "\r\n",
			}
		}
		ctx.Out <- types.WebSocketMessage{
			MessageID:   GenerateMessageID(20),
			ClientID:    ctx.ClientID,
			RefID:       ctx.CommandMsgID,
			MessageType: types.MsgCloseStdout,
		}
		return 0
	}
}
