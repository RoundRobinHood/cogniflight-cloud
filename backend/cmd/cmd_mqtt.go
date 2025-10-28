package cmd

import (
	"fmt"
	"log"
	"slices"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdMQTT struct {
	Events *util.EventHandler[types.MQTTMessage]
}

func (c *CmdMQTT) Identifier() string {
	return "mqtt"
}

func (c *CmdMQTT) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") && !slices.Contains(tags, "atc") && !slices.Contains(tags, "pilot") {
		fmt.Fprint(ctx.Stderr, "access denied")
		return 1
	}

	listener := c.Events.Subscribe()
	defer listener.Unsubscribe()
	log.Println("has listener")

	for {
		select {
		case <-ctx.Ctx.Done():
			return 0
		case msg := <-listener.Out():
			bytes, err := util.YamlCRLF(msg)
			if err != nil {
				fmt.Fprint(ctx.Stderr, "failed to marshal YAML: ", err)
				return 1
			}

			fmt.Fprintf(ctx.Stdout, "%s\r\n---\r\n", string(bytes))
		}
	}
}
