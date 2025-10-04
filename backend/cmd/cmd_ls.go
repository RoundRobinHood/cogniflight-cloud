package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdLs struct {
	FileStore filesystem.Store
}

func (*CmdLs) Identifier() string {
	return "ls"
}

func (c *CmdLs) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no PWD available\r\n")
		return 1
	}

	ls_paths := []string{"."}
	if len(ctx.Args) > 1 {
		ls_paths = ctx.Args[1:]
	}

	clean_paths := make([]string, 0, len(ls_paths))
	path_errors := map[string]string{}
	for _, path := range ls_paths {
		if !ok && path[0] != '/' {
			path_errors[path] = "can't do relative path without PWD"
			continue
		}

		if path[0] == '/' {
			clean_path, err := filesystem.CleanupAbsPath(path)
			if err != nil {
				path_errors[path] = fmt.Sprintf("invalid path: %v", err)
				continue
			}

			clean_paths = append(clean_paths, clean_path)
		} else {
			clean_path, err := filesystem.AbsPath(cwd, path)
			if err != nil {
				path_errors[path] = fmt.Sprintf("invalid path: %v", err)
				continue
			}

			clean_paths = append(clean_paths, clean_path)
		}
	}

	for path, errStr := range path_errors {
		if len(ls_paths) > 1 {
			fmt.Fprintf(ctx.Stderr, "%s:\r\n", path)
		}
		fmt.Fprintf(ctx.Stderr, "error: %s\r\n\r\n", errStr)
	}

	if len(clean_paths) == 0 {
		return 1
	}

	hadSuccess := false
	for _, path := range clean_paths {
		if len(ls_paths) > 1 {
			fmt.Fprintf(ctx.Stderr, "%s:\r\n", path)
		}
		if node, err := c.FileStore.Lookup(ctx.Ctx, tags, path); err != nil {
			fmt.Fprintf(ctx.Stderr, "error looking up directory: %v\r\n\r\n", err)
		} else {
			for _, reference := range node.Entries {
				fmt.Fprintf(ctx.Stdout, "%s\r\n", reference.Name)
			}
		}
	}

	if hadSuccess {
		return 0
	} else {
		return 1
	}
}
