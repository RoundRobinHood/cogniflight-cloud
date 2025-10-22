package cmd

import (
	"errors"
	"fmt"
	"os"
	"slices"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"github.com/goccy/go-yaml"
)

type CmdEdgeNodes struct {
	FileStore filesystem.Store
}

func (c *CmdEdgeNodes) Identifier() string {
	return "edge-nodes"
}

func (c *CmdEdgeNodes) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") && !slices.Contains(tags, "atc") && !slices.Contains(tags, "data-analyst") {
		fmt.Fprint(ctx.Stderr, "error: insufficient permissions")
		return 1
	}

	home, err := c.FileStore.Lookup(ctx.Ctx, []string{"sysadmin"}, "/home")
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to get home folder: ", err)
		return 1
	}

	wg := new(sync.WaitGroup)
	wg.Add(len(home.Entries))
	errs := make(chan error)

	for _, entry := range home.Entries {
		go func(entry types.FsEntryReference) {
			defer wg.Done()

			profile_bytes, err := c.FileStore.LookupReadAll(ctx.Ctx, fmt.Sprintf("/home/%s/user.profile", entry.Name), []string{"atc", "user"})
			if err != nil {
				if !errors.Is(err, types.ErrCantAccessFs) && !errors.Is(err, os.ErrNotExist) {
					errs <- fmt.Errorf("failed to grab user.profile: %w", err)
				}
				return
			}

			var RoleFile struct {
				Role string `yaml:"role"`
			}

			if err := yaml.Unmarshal(profile_bytes, &RoleFile); err != nil {
				errs <- fmt.Errorf("invalid user.profile: %w", err)
				return
			}

			if RoleFile.Role != "edge-node" {
				return
			}

			fmt.Fprint(ctx.Stdout, entry.Name, "\r\n")
		}(entry)
	}

	success := true
	go func() {
		for err := range errs {
			success = false
			fmt.Fprint(ctx.Stderr, "err: ", err)
		}
	}()

	wg.Wait()
	close(errs)

	if success {
		return 0
	} else {
		return 1
	}
}
