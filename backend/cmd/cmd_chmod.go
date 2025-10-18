package cmd

import (
	"fmt"
	"log"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdChmod struct {
	FileStore filesystem.Store
}

func (c *CmdChmod) Identifier() string {
	return "chmod"
}

func (c *CmdChmod) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	if len(ctx.Args) < 3 {
		fmt.Fprint(ctx.Stderr,
			`usage: chmod [-R] <MODE> <PATHS...>
MODE is in the form of <tagname><{+|-}><[rwxp]>
Where you are either adding, revoking or overriding access to a specific tag to read, write, execute or update the permissions of a file.
You must have the update permission on the file to do this, and if you try to update permissions update tags, safety rules apply. If you don't provide -R, this doesn't affect subdirectories
`)
		return 1
	}

	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "no CWD")
		return 1
	}

	vals, args, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "recursive",
			Aliases:    []string{"r", "R"},
			Default:    false,
		},
	}, ctx.Args[1:])

	if err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}

	if len(args) < 2 {
		fmt.Fprint(ctx.Stderr, "invalid usage: run \"chmod\" for usage explanation")
		return 1
	}

	recursive := vals["recursive"].(bool)

	mode_str := args[0]

	tag_name, op, perms := "", "", ""

	addIdx, removeIdx := strings.LastIndex(mode_str, "+"), strings.LastIndex(mode_str, "-")
	if max(addIdx, removeIdx) == -1 {
		fmt.Fprint(ctx.Stderr, "can't recognize op: no + or -")
		return 1
	}

	if addIdx > removeIdx {
		tag_name, op, perms = mode_str[:addIdx], "+", mode_str[addIdx+1:]
	} else {
		tag_name, op, perms = mode_str[:removeIdx], "-", mode_str[removeIdx+1:]
	}
	log.Printf("Interpretation: op %q tag %q with %q perms", op, tag_name, perms)

	for _, perm := range perms {
		if perm != 'r' && perm != 'w' && perm != 'x' && perm != 'p' {
			fmt.Fprintf(ctx.Stderr, "invalid perm: %c", perm)
			return 1
		}
	}

	paths := args[1:]
	abs_paths := make([]string, len(paths))
	for i, path := range paths {
		abs_path, err := filesystem.AbsPath(cwd, path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "invalid path (%q): %v", path, err)
			return 1
		}
		abs_paths[i] = abs_path
	}

	for i, path := range abs_paths {
		for _, perm := range perms {
			var err error
			switch perm {
			case 'r':
				_, err = c.FileStore.Chmod(ctx.Ctx, path, tags, tag_name, op, types.ReadMode, recursive)
			case 'w':
				_, err = c.FileStore.Chmod(ctx.Ctx, path, tags, tag_name, op, types.WriteMode, recursive)
			case 'x':
				_, err = c.FileStore.Chmod(ctx.Ctx, path, tags, tag_name, op, types.ExecuteMode, recursive)
			case 'p':
				_, err = c.FileStore.Chmod(ctx.Ctx, path, tags, tag_name, op, types.UpdatePermissionsMode, recursive)
			}

			if err != nil {
				fmt.Fprintf(ctx.Stderr, "error (%q): failed to update perm (%v): %v", paths[i], perm, err)
			}
		}
	}

	return 0
}
