package cmd

import (
	"fmt"
	"io"
	"log"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdCat struct {
	FileStore filesystem.Store
}

func (*CmdCat) Identifier() string {
	return "cat"
}

func (c *CmdCat) Run(ctx sh.CommandContext) int {
	defer log.Printf("cat finished")
	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no PWD available")
		return 1
	}
	if len(ctx.Args) > 1 {
		files := ctx.Args[1:]
		for i, filepath := range files {
			abs_path, err := filesystem.AbsPath(cwd, filepath)
			if err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): invalid filepath: %v", i, err)}
				return CmdError{}.Run(error_ctx)
			}

			tags := util.GetTags(ctx.Ctx)
			if node, err := c.FileStore.Lookup(ctx.Ctx, tags, abs_path); err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): couldnt lookup file: %v", i, err)}
				return CmdError{}.Run(error_ctx)
			} else {
				if stream, err := c.FileStore.ReadFileObj(ctx.Ctx, *node, tags); err != nil {
					error_ctx := ctx
					error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): couldnt open file for reading: %v", i, err)}
					return CmdError{}.Run(error_ctx)
				} else {
					io.Copy(ctx.Stdout, stream)
					stream.Close()
				}
			}

			ctx.Stdout.Write([]byte("\r\n"))
		}
		return 0
	}

	log.Printf("Have stdin: %v", ctx.Stdin)
	if _, err := io.Copy(ctx.Stdout, ctx.Stdin); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: %v", err)
		return 1
	} else {
		return 0
	}
}
