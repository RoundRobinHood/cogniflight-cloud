package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdMv struct {
	FileStore filesystem.Store
}

func (c *CmdMv) Identifier() string {
	return "mv"
}

func (c *CmdMv) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	if len(ctx.Args) < 3 {
		fmt.Fprint(ctx.Stderr, "usage: mv <SOURCE FILE(S)...> <DESTINATION>")
		return 1
	}

	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no CWD")
		return 1
	}

	source_paths := ctx.Args[1 : len(ctx.Args)-1]
	dest_path := ctx.Args[len(ctx.Args)-1]

	source_abs_paths := make([]string, len(source_paths))

	for i, path := range source_paths {
		abs_path, err := filesystem.AbsPath(cwd, path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "invalid path (%q): %v", path, err)
			return 1
		}
		source_abs_paths[i] = abs_path
	}

	dest_abs_path, err := filesystem.AbsPath(cwd, dest_path)
	if err != nil {
		fmt.Fprintf(ctx.Stderr, "invalid path (%q): %v", dest_path, err)
		return 1
	}

	for i, path := range source_abs_paths {
		if _, err := c.FileStore.Move(ctx.Ctx, dest_abs_path, path, tags); err != nil {
			fmt.Fprintf(ctx.Stderr, "error (%q): couldn't move to %q: %v", source_paths[i], dest_path, err)
			return 1
		}
	}

	return 0
}
