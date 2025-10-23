package cmd

import (
	"fmt"
	"io"
	"log"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/sh"
)

type CmdCat struct {
	FSCtx filesystem.FSContext
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

			if reader, err := c.FSCtx.Open(ctx.Ctx, abs_path, os.O_RDONLY, 0); err != nil {
				fmt.Fprintf(ctx.Stderr, "error opening file (%q): %v", abs_path, err)
				return 1
			} else {
				if _, err := io.Copy(ctx.Stdout, reader); err != nil {
					fmt.Fprintf(ctx.Stderr, "error streaming file (%q): %v", abs_path, err)
					reader.Close()
					return 1
				}
				reader.Close()
			}

			fmt.Fprint(ctx.Stdout, "\r\n")
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
