package cmd

import (
	"fmt"
	"io"
	"log"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"github.com/goccy/go-yaml"
)

type CmdChangePassword struct {
	FileStore filesystem.Store
}

func (c *CmdChangePassword) Identifier() string {
	return "change-password"
}

func (c *CmdChangePassword) Run(ctx sh.CommandContext) int {
	status := util.GetAuthStatus(ctx.Ctx)

	if len(ctx.Args) != 3 {
		fmt.Fprint(ctx.Stderr, "usage: change-password <old_password> <new_password>")
		return 1
	}

	admin_context := filesystem.FSContext{
		Store:    c.FileStore,
		UserTags: []string{"sysadmin"},
	}

	reader, err := admin_context.Open(ctx.Ctx, "/etc/passwd/"+status.Username+".login", os.O_RDONLY, 0)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to get current user's credentials")
		log.Println("Failed to read login file: ", err)
		return 1
	}
	defer reader.Close()

	bytes, err := io.ReadAll(reader)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to read current user's info")
		log.Println("Failed to read login file's bytes: ", err)
		return 1
	}

	var cred types.CredentialsEntry
	if err := yaml.UnmarshalContext(ctx.Ctx, bytes, &cred); err != nil {
		fmt.Fprint(ctx.Stderr, "failed to interpret current user info")
		log.Println("YAML marshal failed: ", err)
		return 1
	}

	if !util.CheckPwd(cred.Password, ctx.Args[1]) {
		fmt.Fprint(ctx.Stderr, "incorrect password")
		return 1
	}

	if hashed, err := util.HashPwd(ctx.Args[2]); err != nil {
		fmt.Fprint(ctx.Stderr, "failed to hash pwd")
		return 1
	} else {
		cred.Password = hashed
	}

	new_bytes, err := util.YamlCRLF(cred)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to generate new login file")
		return 1
	}

	writer, err := admin_context.Open(ctx.Ctx, "/etc/passwd/"+status.Username+".login", os.O_WRONLY|os.O_TRUNC, 0)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "failed to generate new login file")
		return 1
	}

	defer writer.Close()
	if _, err := writer.Write(new_bytes); err != nil {
		fmt.Fprint(ctx.Stderr, "failed to generate new login file")
		log.Println("write error: ", err)
		return 1
	}

	return 0
}
