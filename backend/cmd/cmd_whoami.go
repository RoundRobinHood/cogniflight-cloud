package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
)

type CmdWhoami struct {
	FileStore filesystem.Store
}

func (*CmdWhoami) Identifier() string {
	return "whoami"
}

func (c *CmdWhoami) Run(ctx types.CommandContext) int {
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgOpenStdOut,
	}
	defer func() {
		ctx.Out <- types.WebSocketMessage{
			MessageID:   GenerateMessageID(20),
			ClientID:    ctx.ClientID,
			RefID:       ctx.CommandMsgID,
			MessageType: types.MsgCloseStdout,
		}
	}()

	auth_bytes, err := util.YamlCRLF(ctx.AuthStatus)
	if err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error: couldn't marshal auth status: %v", err)}
		return CmdError{}.Run(error_ctx)
	}
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgOutputStream,

		OutputStream: "# AuthStatus\r\n" + string(auth_bytes),
	}

	profileBytes, err := c.FileStore.LookupReadAll(ctx.Ctx, fmt.Sprintf("/home/%s/user.profile", ctx.AuthStatus.Username), ctx.ParentTags)
	if err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error: couldn't read profile file: %v", err)}
		CmdError{}.Run(error_ctx)
	} else {
		ctx.Out <- types.WebSocketMessage{
			MessageID:   GenerateMessageID(20),
			ClientID:    ctx.ClientID,
			RefID:       ctx.CommandMsgID,
			MessageType: types.MsgOutputStream,

			OutputStream: "\r\n# user.profile\r\n" + string(profileBytes),
		}
	}

	return 0
}
