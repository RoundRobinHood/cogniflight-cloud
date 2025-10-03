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
	if node, err := c.FileStore.Lookup(ctx.Ctx, tags, ctx.Args[1]); err != nil {
		error_ctx := ctx
		error_ctx.Args = []string{"error", fmt.Sprintf("error looking up directory: %v", err)}
		return CmdError{}.Run(error_ctx)
	} else {
		for _, reference := range node.Entries {
			fmt.Fprintf(ctx.Stdout, "%s\r\n", reference.Name)
		}
		return 0
	}
}
