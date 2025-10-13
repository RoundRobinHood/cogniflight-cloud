package cmd

import (
	"fmt"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdClients struct {
	Socket *types.SocketSession
}

func (c *CmdClients) Identifier() string {
	return "clients"
}

func (c *CmdClients) Run(ctx sh.CommandContext) int {
	failed := false
	c.Socket.Each(func(status types.ClientStatus) bool {
		data, err := util.YamlCRLF(status)
		if err != nil {
			failed = true
			fmt.Fprintf(ctx.Stderr, "marshal error: %v", err)
			return false
		}

		fmt.Fprint(ctx.Stdout, "- ")
		fmt.Fprint(ctx.Stdout, strings.ReplaceAll(string(data), "\n", "\n  "), "\r\n")

		return true
	})

	if failed {
		return 1
	} else {
		return 0
	}
}
