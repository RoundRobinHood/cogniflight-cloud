package cmd

import (
	"fmt"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdEcho struct{}

func (CmdEcho) Identifier() string {
	return "echo"
}

func (CmdEcho) Run(ctx types.CommandContext) int {
	out_string := strings.Join(ctx.Args[1:], " ")
	if _, err := ctx.Stdout.Write([]byte(out_string)); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: %v", err)
		return 1
	} else {
		return 0
	}
}
