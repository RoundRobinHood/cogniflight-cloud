package cmd

import (
	"errors"
	"fmt"
	"io"
	"os"
	"slices"
	"strings"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"github.com/goccy/go-yaml"
)

type CmdFinishFlight struct {
	FileStore filesystem.Store
}

func (c *CmdFinishFlight) Identifier() string {
	return "finish-flight"
}

func (c *CmdFinishFlight) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "atc") && !slices.Contains(tags, "sysadmin") && !slices.Contains(tags, "edge-node") {
		fmt.Fprint(ctx.Stderr, "access denied")
		return 1
	}

	if len(ctx.Args) != 2 {
		fmt.Fprint(ctx.Stderr, "usage: finish-flight <FLIGHT_ID>")
		return 1
	}

	flight_id := ctx.Args[1]
	if strings.Contains(flight_id, "/") {
		fmt.Fprint(ctx.Stderr, "bad flight_id")
		return 1
	}

	home, err := c.FileStore.Lookup(ctx.Ctx, []string{"sysadmin"}, "/home")
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to get home folder: ", err)
		return 1
	}

	fsCtx := &filesystem.FSContext{
		Store: c.FileStore,
		UserTags: []string{"sysadmin"},
	}

	for _, entry := range home.Entries {
		profile_bytes, err := c.FileStore.LookupReadAll(ctx.Ctx, fmt.Sprintf("/home/%s/user.profile", entry.Name), []string{"atc", "user"})
		if err != nil {
			if !errors.Is(err, types.ErrCantAccessFs) && !errors.Is(err, os.ErrNotExist) {
				fmt.Fprintf(ctx.Stderr, "failed to grab user.profile: %v", err)
			}
			return 1
		}

		var RoleFile struct {
			Role string `yaml:"role"`
		}

		if err := yaml.Unmarshal(profile_bytes, &RoleFile); err != nil {
			fmt.Fprintf(ctx.Stderr, "invalid user.profile: %v", err)
			return 1
		}

		if RoleFile.Role != "edge-node" {
			continue
		}

		flight_path := fmt.Sprintf("/home/%s/flights/%s.flight", entry.Name, flight_id)

		if readWriter, err := fsCtx.Open(ctx.Ctx, flight_path, os.O_RDWR | os.O_APPEND, 0); err != nil {
			if !errors.Is(err, os.ErrNotExist) && !errors.Is(err, types.ErrCantAccessFs) {
				fmt.Fprint(ctx.Stderr, "failed to open flight file: ", err)
				return 1
			}
		} else {
			defer readWriter.Close()
			data, err := io.ReadAll(readWriter)
			if err != nil {
				fmt.Fprint(ctx.Stderr, "failed to read login file: ", err)
				return 1
			}

			var val map[string]any
			if err := yaml.UnmarshalContext(ctx.Ctx, data, &val); err != nil {
				fmt.Fprint(ctx.Stderr, "flight file contains invalid YAML: ", err)
				return 1
			}

			if _, ok := val["end_timestamp"]; ok {
				fmt.Fprint(ctx.Stderr, "flight is already ended")
				return 1
			}

			timestamp_str := fmt.Sprintf("\r\nend_timestamp: %d\r\n", time.Now().UnixNano())
			if _, err := readWriter.Write([]byte(timestamp_str)); err != nil {
				fmt.Fprint(ctx.Stderr, "failed to write to flight file: ", err)
				return 1
			}

			return 0
		}
	}

	fmt.Fprint(ctx.Stderr, "flight ID not found")
	return 1
}
