package cmd

import (
	"encoding/base64"
	"io"

	"github.com/RoundRobinHood/sh"
)

type CmdB64 struct{}

func (CmdB64) Identifier() string {
	return "base64"
}

func (CmdB64) Run(ctx sh.CommandContext) int {
	encoder := base64.NewEncoder(base64.StdEncoding, ctx.Stdout)
	io.Copy(encoder, ctx.Stdin)
	encoder.Close()

	return 0
}
