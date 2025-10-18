package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdMkdir struct {
	FileStore filesystem.Store
}

func (*CmdMkdir) Identifier() string {
	return "mkdir"
}

func (c *CmdMkdir) Run(ctx sh.CommandContext) int {
	if len(ctx.Args) == 1 {
		fmt.Fprint(ctx.Stderr, "Usage: mkdir <filepaths>")
		return 1
	}
	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no PWD available")
		return 1
	}

	type Mkdir struct {
		folder_path, filename string
	}
	mkdirs := make([]Mkdir, len(ctx.Args)-1)

	for i, path := range ctx.Args[1:] {
		abs_path, err := filesystem.AbsPath(cwd, ctx.Args[1])
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error: invalid path (%q): %v", path, err)
			return 1
		}
		folder_path, filename, err := filesystem.DirUp(abs_path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error doing DirUp (%q): %v", path, err)
			return 1
		}
		mkdirs[i] = Mkdir{folder_path, filename}
	}

	tags := util.GetTags(ctx.Ctx)
	failed := false
	for _, mkdir := range mkdirs {
		folder, err := c.FileStore.Lookup(ctx.Ctx, tags, mkdir.folder_path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error looking for folder (%q): %v\r\n", mkdir.folder_path, err)
			failed = true
			continue
		}

		if folder.EntryType != types.Directory {
			fmt.Fprintf(ctx.Stderr, "error: %q is not a directory\r\n", mkdir.folder_path)
			failed = true
			continue
		}

		if _, err := c.FileStore.WriteDirectory(ctx.Ctx, folder.ID, mkdir.filename, tags, nil); err != nil {
			fmt.Fprintf(ctx.Stderr, "error: failed to create folder: %v\r\n", err)
			failed = true
			continue
		}
	}

	if failed {
		return 1
	} else {
		return 0
	}
}
