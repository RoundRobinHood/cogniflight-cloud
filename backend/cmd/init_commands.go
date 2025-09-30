package cmd

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

func InitCommands(filestore filesystem.Store) map[string]types.Command {
	cmds := []types.Command{
		&CmdLs{FileStore: filestore},
		&CmdMkdir{FileStore: filestore},
		&CmdCat{FileStore: filestore},
		&CmdTee{FileStore: filestore},
		CmdEcho{},
		CmdError{},
		&CmdWhoami{FileStore: filestore},
	}

	output := make(map[string]types.Command)
	for _, cmd := range cmds {
		output[cmd.Identifier()] = cmd
	}

	return output
}
