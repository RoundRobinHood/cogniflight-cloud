package cmd

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdLogout struct {
	FileStore filesystem.Store
}

func (c *CmdLogout) Identifier() string {
	return "logout"
}

func (c *CmdLogout) Run(ctx sh.CommandContext) int {
	status := util.GetAuthStatus(ctx.Ctx)

	if _, err := c.FileStore.RemoveFile(ctx.Ctx, "/etc/sess/"+status.SessID+".sess", []string{"sysadmin"}, false, false); err != nil {
		if !errors.Is(os.ErrNotExist, err) {
			fmt.Fprint(ctx.Stderr, "failed to remove session")
			log.Println("err: ", err)
			return 1
		}
	}

	return 0
}
