package cmd

import "github.com/RoundRobinHood/cogniflight-cloud/backend/types"

func InitCommands(userStore types.UserStore, fileRoot types.FsDirectory) map[string]types.Command {
	cmds := []types.Command{
		&CmdCat{FileRoot: fileRoot},
		CmdEcho{},
		CmdError{},
		CmdWhoami{Store: userStore},
	}

	output := make(map[string]types.Command)
	for _, cmd := range cmds {
		output[cmd.Identifier()] = cmd
	}

	return output
}
