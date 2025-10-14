package cmd

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/chatbot"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/sh"
)

func InitCommands(filestore filesystem.Store, socketSession *types.SocketSession, sessionStore *types.SessionStore, apiKey chatbot.APIKey) []sh.Command {
	commands := []sh.Command{
		&CmdLs{FileStore: filestore},
		&CmdMkdir{FileStore: filestore},
		&CmdCat{FileStore: filestore},
		&CmdTee{FileStore: filestore},
		CmdEcho{},
		CmdError{},
		&CmdWhoami{FileStore: filestore, Session: socketSession},
		&CmdClients{Socket: socketSession},
		&CmdSockets{SessionStore: sessionStore},
		&CmdPilots{FileStore: filestore},
	}

	activate_cmd := &CmdActivate{
		APIKey: apiKey,
	}

	commands = append(commands, activate_cmd)
	activate_cmd.Commands = commands

	return commands
}
