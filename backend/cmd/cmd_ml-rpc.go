package cmd

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"github.com/sourcegraph/jsonrpc2"
)

type CmdMLRPC struct {
	Conn *jsonrpc2.Conn
}

func (c CmdMLRPC) Identifier() string {
	return "ml-rpc"
}

func (c CmdMLRPC) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") && !slices.Contains(tags, "data-analyst") && !slices.Contains(tags, "atc") {
		fmt.Fprint(ctx.Stderr, "access denied")
		return 1
	}

	if len(ctx.Args) == 1 || ctx.Args[1] == "-h" || ctx.Args[1] == "--help" || len(ctx.Args)%2 != 0 {
		fmt.Fprint(ctx.Stderr, "usage: ml-rpc <method> [params...]\r\neach param is a flag-name value pair, e.g. ml-rpc add -a 1 -b 2 (amount of dashes doesn't matter)")
		return 1
	}

	method := ctx.Args[1]
	params := map[string]any{}

	if len(ctx.Args) > 2 {
		flag_name := ""
		for i, arg := range ctx.Args[2:] {
			if i%2 == 0 {
				flag_name = strings.TrimLeft(arg, "-")
			} else {
				var val any
				if err := json.Unmarshal([]byte(arg), &val); err != nil {
					val = arg
				}
				params[flag_name] = val
			}
		}
	}

	var response any
	if err := c.Conn.Call(ctx.Ctx, method, params, &response); err != nil {
		fmt.Fprint(ctx.Stderr, "failed to call method:", err)
		return 1
	}

	if data, err := util.YamlCRLF(response); err != nil {
		fmt.Fprint(ctx.Stderr, "failed to marshal YAML:", err)
		return 1
	} else {
		ctx.Stdout.Write(data)
	}

	return 0
}
