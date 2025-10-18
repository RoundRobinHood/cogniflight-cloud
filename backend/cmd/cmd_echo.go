package cmd

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdEcho struct{}

func (CmdEcho) Identifier() string {
	return "echo"
}

func (CmdEcho) Run(ctx sh.CommandContext) int {
	if len(ctx.Args) == 0 {
		fmt.Fprint(ctx.Stdout, "\r\n")
		return 0
	}
	flags, outputs, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "escape",
			Aliases:    []string{"escape", "e"},
			Default:    false,
		},
		{
			Identifier: "no_newline",
			Aliases:    []string{"no_newline", "n"},
			Default:    false,
		},
	}, ctx.Args[1:])
	if err != nil {
		fmt.Fprint(ctx.Stderr, err, "\r\n")
		return 1
	}

	out_string := strings.Join(outputs, " ")
	if flags["escape"].(bool) {
		out_string, err = strconv.Unquote(`"` + strings.ReplaceAll(out_string, `"`, `\"`) + `"`)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "failed to unescape provided str: %v\r\n", err)
			return 1
		}
	}
	if _, err := ctx.Stdout.Write([]byte(out_string)); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: %v", err)
		return 1
	}

	if !flags["no_newline"].(bool) {
		fmt.Fprint(ctx.Stdout, "\r\n")
	}

	return 0
}
