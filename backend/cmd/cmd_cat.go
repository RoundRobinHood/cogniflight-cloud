package cmd

import (
	"fmt"
	"io"
	"log"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdCat struct {
	FileStore filesystem.Store
}

func (*CmdCat) Identifier() string {
	return "cat"
}

func (c *CmdCat) Run(ctx types.CommandContext) int {
	if len(ctx.Args) > 1 {
		files := ctx.Args[1:]
		for i, filepath := range files {
			abs_path, err := filesystem.AbsPath("/", filepath)
			if err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): invalid filepath: %v", i, err)}
				return CmdError{}.Run(error_ctx)
			}

			if node, err := c.FileStore.Lookup(ctx.Ctx, ctx.ParentTags, abs_path); err != nil {
				error_ctx := ctx
				error_ctx.Args = []string{"error", fmt.Sprintf("error (arg %d): couldnt lookup file: %v", i, err)}
				return CmdError{}.Run(error_ctx)
			} else {
				if stream, err := c.FileStore.ReadFileObj(ctx.Ctx, *node, ctx.ParentTags); err != nil {
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
