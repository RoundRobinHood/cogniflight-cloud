package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdCopy struct {
	FileStore filesystem.Store
}

func (c *CmdCopy) Identifier() string {
	return "cp"
}

func (c *CmdCopy) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	if len(ctx.Args) < 3 {
		fmt.Fprint(ctx.Stderr, "usage: cp [-r] <SOURCE_PATHS...> <DEST_PATH...>")
		return 1
	}

	val, args, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "recursive",
			Aliases:    []string{"R", "r"},
			Default:    false,
		},
	}, ctx.Args[1:])
	if err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}

	recursive := val["recursive"].(bool)

	if len(args) < 2 {
		fmt.Fprint(ctx.Stderr, "not enough arguments")
		return 1
	}

	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "no CWD")
		return 1
	}

	source_paths := args[:len(args)-1]
	dest_path := args[len(args)-1]

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
		if _, err := c.FileStore.Copy(ctx.Ctx, dest_abs_path, path, tags, recursive); err != nil {
			fmt.Fprintf(ctx.Stderr, "error (%q): failed to copy: %v", source_paths[i], err)
		}
	}

	return 0
}
