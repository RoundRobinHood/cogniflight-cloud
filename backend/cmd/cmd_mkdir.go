package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdMkdir struct {
	FileStore filesystem.Store
}

func (*CmdMkdir) Identifier() string {
	return "mkdir"
}

func (c *CmdMkdir) Run(ctx types.CommandContext) int {
	folder_path, filename, err := filesystem.DirUp(ctx.Args[1])
	if err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error: invalid path (%q): %v", ctx.Args[1], err)}
		return CmdError{}.Run(error_ctx)
	}

	folder, err := c.FileStore.Lookup(ctx.Ctx, ctx.ParentTags, folder_path)
	if err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error looking for folder (%q): %v", folder_path, err)}
		return CmdError{}.Run(error_ctx)
	}

	if folder.EntryType != types.Directory {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error: %q is not a directory", folder_path)}
		return CmdError{}.Run(error_ctx)
	}

	if _, err := c.FileStore.WriteDirectory(ctx.Ctx, folder.ID, filename, ctx.ParentTags); err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error creating directory: %v", err)}
		return CmdError{}.Run(error_ctx)
	}

	return 0
}
