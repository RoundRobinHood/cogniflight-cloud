package cmd

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdWhoami struct {
	FileStore filesystem.Store
}

func (*CmdWhoami) Identifier() string {
	return "whoami"
}

func (c *CmdWhoami) Run(ctx sh.CommandContext) int {
	status := util.GetAuthStatus(ctx.Ctx)
	tags := util.GetTags(ctx.Ctx)
	auth_bytes, err := util.YamlCRLF(status)
	if err != nil {
		fmt.Fprintf(ctx.Stderr, "error: couldn't marshal auth status: %v", err)
		return 1
	}
	fmt.Fprintf(ctx.Stdout, "# AuthStatus\r\n%s", string(auth_bytes))

	profileBytes, err := c.FileStore.LookupReadAll(ctx.Ctx, fmt.Sprintf("/home/%s/user.profile", status.Username), tags)
	if err != nil {
		fmt.Fprintf(ctx.Stderr, "error: couldn't read profile file: %v", err)
	} else {
		fmt.Fprintf(ctx.Stdout, "\r\n# user.profile\r\n%s", string(profileBytes))
	}

	return 0
}
