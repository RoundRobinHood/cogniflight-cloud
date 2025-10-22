package cmd

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdHeartbeat struct{}

func (CmdHeartbeat) Identifier() string {
	return "heartbeat"
}

func (CmdHeartbeat) Run(ctx sh.CommandContext) int {
	opts := map[string]any{"delay": "500"}
	args := []string{"beep"}
	if len(ctx.Args) > 1 {
		var err error
		opts, args, err = util.ParseArgs([]types.OptionDescriptor{
			{
				Identifier: "delay", // in ms
				Aliases:    []string{"d", "delay"},
				Default:    "500",
			},
		}, ctx.Args[1:])
		if err != nil {
			fmt.Fprint(ctx.Stderr, err)
			return 1
		}
	}

	var duration_ms int
	if _, err := fmt.Sscan(opts["delay"].(string), &duration_ms); err != nil {
		fmt.Fprint(ctx.Stderr, "error: invalid number")
		return 1
	}

	if duration_ms <= 0 {
		fmt.Fprint(ctx.Stderr, "duration must be more than 0")
		return 1
	}

	ticker := time.NewTicker(time.Millisecond * time.Duration(duration_ms))
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			fmt.Fprint(ctx.Stdout, strings.Join(args, " "), "\r\n")
			log.Println("ctx: ", ctx.Ctx.Err())
		case <-ctx.Ctx.Done():
			return 0
		}
	}
}
