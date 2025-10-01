package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdLs struct {
	FileStore filesystem.Store
}

func (*CmdLs) Identifier() string {
	return "ls"
}

func (c *CmdLs) Run(ctx types.CommandContext) int {
	if node, err := c.FileStore.Lookup(ctx.Ctx, ctx.ParentTags, ctx.Args[1]); err != nil {
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
