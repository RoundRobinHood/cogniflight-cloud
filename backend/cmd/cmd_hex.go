package cmd

import (
	"encoding/hex"
	"io"

	"github.com/RoundRobinHood/sh"
)

type CmdHex struct{}

func (CmdHex) Identifier() string {
	return "hex"
}

func (CmdHex) Run(ctx sh.CommandContext) int {
	encoder := hex.NewEncoder(ctx.Stdout)
	io.Copy(encoder, ctx.Stdin)

	return 0
}
