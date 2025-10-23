package cmd

import (
	"fmt"
	"slices"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdRm struct {
	FileStore filesystem.Store
}

func (c *CmdRm) Identifier() string {
	return "rm"
}

func (c *CmdRm) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	if len(ctx.Args) == 1 || slices.Contains(ctx.Args, "-h") || slices.Contains(ctx.Args, "--help") {
		fmt.Fprint(ctx.Stderr, "usage: rm [-rf] <FILES...>")
		return 1
	}
	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no PWD available")
		return 1
	}

	opts, paths, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "recursive",
			Aliases:    []string{"r", "recursive"},
			Default:    false,
		},
		{
			Identifier: "forced",
			Aliases:    []string{"f", "forced"},
			Default:    false,
		},
	}, ctx.Args[1:])
	if err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}

	rmDirectories := opts["recursive"].(bool)
	forced := opts["forced"].(bool)

	if len(paths) == 0 {
		fmt.Fprint(ctx.Stderr, "usage: rm [-rf] <FILES...>")
		return 1
	}

	abs_paths := make([]string, len(paths))
	for i, path := range paths {
		abs_path, err := filesystem.AbsPath(cwd, path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error: path invalid (%q): %v", path, err)
			return 1
		}
		abs_paths[i] = abs_path
	}

	for i, path := range abs_paths {
		if _, err := c.FileStore.RemoveFile(ctx.Ctx, path, tags, forced, rmDirectories); err != nil {
			fmt.Fprintf(ctx.Stderr, "error: failed to remove file (%q): %v", paths[i], err)
			return 1
		}
	}

	return 0
}
