package cmd

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/chatbot"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/sh"
)

func InitCommands(filestore filesystem.Store, fsctx filesystem.FSContext, socketSession *types.SocketSession, sessionStore *types.SessionStore, apiKey chatbot.APIKey) []sh.Command {
	commands := []sh.Command{
		&CmdLs{FileStore: filestore},
		&CmdMkdir{FileStore: filestore},
		&CmdCat{FSCtx: fsctx},
		&CmdTee{FileStore: filestore},
		&CmdRm{FileStore: filestore},
		CmdEcho{},
		CmdError{},
		&CmdWhoami{FileStore: filestore, Session: socketSession},
		&CmdClients{Socket: socketSession},
		&CmdSockets{SessionStore: sessionStore},
		&CmdPilots{FileStore: filestore},
		&CmdMv{FileStore: filestore},
		CmdHelp{},
	}

	activate_cmd := &CmdActivate{
		APIKey:    apiKey,
		FileStore: filestore,
	}

	commands = append(commands, activate_cmd)
	activate_cmd.Commands = commands

	return commands
}
