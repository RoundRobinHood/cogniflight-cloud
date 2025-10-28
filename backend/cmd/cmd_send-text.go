package cmd

import (
	"fmt"
	"io"
	"slices"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/uazapi"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdSendText struct {
	UazapiConfig uazapi.UazapiConfig
}

func (c *CmdSendText) Identifier() string {
	return "send-text"
}

func (c *CmdSendText) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") && !slices.Contains(tags, "atc") {
		fmt.Fprint(ctx.Stderr, "access denied")
		return 1
	}

	if len(ctx.Args) == 1 {
		fmt.Fprint(ctx.Stderr, "usage: send-text [-p] <numbers...>")
		return 1
	}

	opts, numbers, err := util.ParseArgs([]types.OptionDescriptor{
		{
			Identifier: "preview_links",
			Aliases:    []string{"p", "preview", "preview-links"},
			Default:    false,
		},
	}, ctx.Args[1:])
	if err != nil {
		fmt.Fprint(ctx.Stderr, err)
		return 1
	}

	if len(numbers) == 0 {
		fmt.Fprint(ctx.Stderr, "usage: send-text [-p] <numbers...>")
		return 1
	}

	preview_links := opts["preview_links"].(bool)

	message_bytes, err := io.ReadAll(ctx.Stdin)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to read input: ", err)
		return 1
	}

	if len(message_bytes) == 0 {
		fmt.Fprint(ctx.Stderr, "error: can't send an empty text message")
	}

	message_text := string(message_bytes)
	for _, number := range numbers {
		if err := c.UazapiConfig.SendTextMessage(uazapi.TxtMessage{
			Number:      number,
			Text:        message_text,
			LinkPreview: preview_links,
		}); err != nil {
			fmt.Fprintf(ctx.Stderr, "failed to send message to %q: %v", number, err)
			return 1
		}
	}

	return 0
}
