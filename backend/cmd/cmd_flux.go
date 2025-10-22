package cmd

import (
	"fmt"
	"io"
	"slices"
	"strings"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/influx"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdFluxStream struct {
	FluxCfg *influx.InfluxDBConfig
}

func (c CmdFluxStream) Identifier() string {
	return "flux"
}

func (c CmdFluxStream) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") && !slices.Contains(tags, "atc") && !slices.Contains(tags, "data-analyst") {
		fmt.Fprint(ctx.Stderr, "access denied: not enough permissions for this command")
		return 1
	}

	flux_query, err := io.ReadAll(ctx.Stdin)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to read all stdin: ", err)
	}

	record_ch := make(chan map[string]string)
	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		defer wg.Done()
		for record := range record_ch {
			serial, err := util.YamlCRLF(record)
			if err != nil {
				fmt.Fprint(ctx.Stderr, "failed to marshal YAML: ", err)
			}
			out_str := "- " + strings.ReplaceAll(string(serial), "\n", "\n  ")
			fmt.Fprint(ctx.Stdout, out_str, "\r\n")
		}
	}()

	if err := c.FluxCfg.StreamFlux(ctx.Ctx, string(flux_query), record_ch); err != nil {
		fmt.Fprint(ctx.Stderr, "failed to perform influx stream: ", err)
		return 1
	}
	wg.Wait()

	return 0
}
