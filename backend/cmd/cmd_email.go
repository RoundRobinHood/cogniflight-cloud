package cmd

import (
	"fmt"
	"io"
	"slices"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/email"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdEmail struct {
	EmailConfig email.EmailConfig
}

func (c CmdEmail) Identifier() string {
	return "email"
}

func (c CmdEmail) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") && !slices.Contains(tags, "atc") {
		fmt.Fprint(ctx.Stderr, "access denied")
		return 1
	}

	if len(ctx.Args) == 1 {
		fmt.Fprint(ctx.Stderr, "usage: email [-s <subject>] [-c <content-type>] <target-address>")
		return 1
	}

	opts, email, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "subject",
			Aliases:    []string{"s", "subject"},
			Default:    "",
		},
		{
			Identifier: "content_type",
			Aliases:    []string{"c", "content-type"},
			Default:    "text/plain",
		},
	}, ctx.Args[1:])

	if err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}

	if len(email) != 1 {
		fmt.Fprint(ctx.Stderr, "usage: email [-s <subject>] [-c <content-type>] <target-address>")
		return 1
	}

	subject := opts["subject"].(string)
	contentType := opts["content_type"].(string)

	email_bytes, err := io.ReadAll(ctx.Stdin)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "error getting input: ", err)
		return 1
	}

	if err := c.EmailConfig.SendEmail(email[0], subject, contentType, string(email_bytes)); err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}

	return 0
}
