package cmd

import (
	"fmt"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type CmdError struct{}

func (CmdError) Identifier() string {
	return "error"
}

func (CmdError) Run(ctx types.CommandContext) int {
	err_string := strings.Join(ctx.Args[1:], " ")
	if _, err := ctx.Stderr.Write([]byte(err_string)); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: %v", err)
	}
	return 1
}
