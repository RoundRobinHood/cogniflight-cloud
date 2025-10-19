package cmd

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"slices"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdCryptoRand struct{}

func (CmdCryptoRand) Identifier() string {
	return "crypto-rand"
}

func (CmdCryptoRand) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	if !slices.Contains(tags, "sysadmin") {
		fmt.Fprint(ctx.Stderr, "access denied")
		return 1
	}

	if len(ctx.Args) == 1 {
		fmt.Fprint(ctx.Stderr, "usage: crypto-rand [--format|-f] <byte length>")
		return 1
	}

	opts, lengths, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "format",
			Aliases:    []string{"f", "format"},
			Default:    "hex",
		},
	}, ctx.Args[1:])
	if err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}

	if len(lengths) > 1 {
		fmt.Fprint(ctx.Stderr, "error: more than one positional parameter provided")
		return 1
	}

	var length int
	if _, err := fmt.Sscan(lengths[0], &length); err != nil {
		fmt.Fprint(ctx.Stderr, "error: invalid length number")
		return 1
	}
	if length <= 0 || length > 256 {
		fmt.Fprint(ctx.Stderr, "error: length outside of valid range")
		return 1
	}

	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		fmt.Fprint(ctx.Stderr, "error generating random bytes: ", err)
		return 1
	}

	switch format := opts["format"].(string); format {
	case "hex":
		fmt.Fprintf(ctx.Stdout, "%x", buf)
	case "base64", "b64":
		str := base64.URLEncoding.EncodeToString(buf)
		fmt.Fprint(ctx.Stdout, str)
	default:
		fmt.Fprint(ctx.Stderr, "error: invalid format: ", format)
		return 1
	}

	return 0
}
