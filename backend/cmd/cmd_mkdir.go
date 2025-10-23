package cmd

import (
	"errors"
	"fmt"
	"os"
	"slices"

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
	if len(ctx.Args) == 1 || slices.Contains(ctx.Args, "-h") || slices.Contains(ctx.Args, "--help") {
		fmt.Fprint(ctx.Stderr, "Usage: mkdir [-p] <filepaths>")
		return 1
	}
	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no PWD available")
		return 1
	}
	tags := util.GetTags(ctx.Ctx)

	opts, paths, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "make_parents",
			Aliases:    []string{"p", "parents"},
			Default:    false,
		},
	}, ctx.Args[1:])
	if err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}
	make_parents := opts["make_parents"].(bool)

	abs_paths := make([]string, len(paths))

	for i, path := range paths {
		abs_path, err := filesystem.AbsPath(cwd, path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error: invalid path (%q): %v", path, err)
			return 1
		}
		abs_paths[i] = abs_path
	}

	for i, path := range abs_paths {
		if _, err := c.FileStore.Mkdir(ctx.Ctx, path, tags, nil, make_parents); err != nil {
			if errors.Is(err, os.ErrExist) && make_parents {
				continue
			}
			fmt.Fprintf(ctx.Stderr, "error creating directory (%q, abs path %q): %v", paths[i], path, err)
			return 1
		}
	}

	return 0
}
