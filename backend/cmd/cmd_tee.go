package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CmdTee struct {
	FileStore filesystem.Store
}

func (*CmdTee) Identifier() string {
	return "tee"
}

func (c *CmdTee) Run(ctx types.CommandContext) int {
	if len(ctx.Args) == 0 {
		cat_ctx := ctx
		cat_ctx.Args = []string{"cat"}
		return (&CmdCat{FileStore: c.FileStore}).Run(cat_ctx)
	}

	parents := make([]types.FsEntry, 0, len(ctx.Args)-1)
	filenames := make([]string, 0, len(ctx.Args)-1)
	for _, path := range ctx.Args[1:] {
		folder_path, filename, err := filesystem.DirUp(path)
		if err != nil {
			error_ctx := ctx
			error_ctx.Args = []string{"error", fmt.Sprintf("error: invalid path (%q): %v", path, err)}
			return CmdError{}.Run(error_ctx)
		}

		if parent, err := c.FileStore.Lookup(ctx.Ctx, ctx.ParentTags, folder_path); err != nil {
			error_ctx := ctx
			error_ctx.Args = []string{"error", fmt.Sprintf("error: failed to get folder (%q): %v", folder_path, err)}
			return CmdError{}.Run(error_ctx)
		} else {
			// Early permissions check (to help avoid problems later)
			if !parent.Permissions.IsAllowed(types.WriteMode, ctx.ParentTags) {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error: cannot write to folder (%q): %v", folder_path, types.ErrCantAccessFs)}
				return CmdError{}.Run(error_ctx)
			}
			if !parent.Permissions.IsAllowed(types.ExecuteMode, ctx.ParentTags) {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error: cannot descend into folder (%q): %v", folder_path, types.ErrCantAccessFs)}
				return CmdError{}.Run(error_ctx)
			}
			parents = append(parents, *parent)
			filenames = append(filenames, filename)
		}
	}

	fileRef := primitive.NewObjectID()
	stream, err := c.FileStore.Bucket.OpenUploadStreamWithID(fileRef, "")
	if err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error: failed to open upload stream: %v", err)}
		return CmdError{}.Run(error_ctx)
	}

	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgOpenStdOut,
	}
	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgOpenStdin,
	}

	stdinOpen := true
	for stdinOpen {
		select {
		case incoming := <-ctx.In:
			switch incoming.MessageType {
			case types.MsgInputStream:
				if _, err := stream.Write([]byte(incoming.InputStream)); err != nil {
					error_ctx := ctx
					error_ctx.Args = []string{"error", fmt.Sprintf("error: failed to write to upload stream: %v", err)}
					CmdError{}.Run(error_ctx)
					stream.Close()
					ctx.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    ctx.ClientID,
						RefID:       ctx.CommandMsgID,
						MessageType: types.MsgCloseStdout,
					}
					ctx.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    ctx.ClientID,
						RefID:       ctx.CommandMsgID,
						MessageType: types.MsgCloseStdin,
					}
					return 1
				}
				ctx.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    ctx.ClientID,
					RefID:       ctx.CommandMsgID,
					MessageType: types.MsgOutputStream,

					OutputStream: incoming.InputStream,
				}
			case types.MsgInputEOF:
				stdinOpen = false
				if err := stream.Close(); err != nil {
					error_ctx := ctx
					error_ctx.Args = []string{"error", fmt.Sprintf("error: failed to finalize file upload: %v", err)}
					CmdError{}.Run(error_ctx)
					ctx.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    ctx.ClientID,
						RefID:       ctx.CommandMsgID,
						MessageType: types.MsgCloseStdout,
					}

					return 1
				}
			}
		case <-ctx.Ctx.Done():
			stdinOpen = false
			ctx.Out <- types.WebSocketMessage{
				MessageID:   GenerateMessageID(20),
				ClientID:    ctx.ClientID,
				RefID:       ctx.CommandMsgID,
				MessageType: types.MsgCloseStdin,
			}
			ctx.Out <- types.WebSocketMessage{
				MessageID:   GenerateMessageID(20),
				ClientID:    ctx.ClientID,
				RefID:       ctx.CommandMsgID,
				MessageType: types.MsgCloseStdout,
			}
			error_ctx := ctx
			if err := stream.Close(); err != nil {
				error_ctx.Args = []string{"error", fmt.Sprintf("error: failed to finalize file upload: %v", err)}
			} else {
				error_ctx.Args = []string{"error", fmt.Sprintf("error: context end: %v", ctx.Ctx.Err())}
			}
			return CmdError{}.Run(error_ctx)
		}
	}

	ctx.Out <- types.WebSocketMessage{
		MessageID:   GenerateMessageID(20),
		ClientID:    ctx.ClientID,
		RefID:       ctx.CommandMsgID,
		MessageType: types.MsgCloseStdout,
	}
	for i := range parents {
		if _, err := c.FileStore.WriteFile(ctx.Ctx, parents[i].ID, filenames[i], fileRef, ctx.ParentTags); err != nil {
			error_ctx := ctx
			error_ctx.Args = []string{"error", fmt.Sprintf("error: failed to write file (%q): %v", filenames[i], err)}
			return CmdError{}.Run(error_ctx)
		}
	}

	return 0
}
