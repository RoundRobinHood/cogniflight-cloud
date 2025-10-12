package cmd

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/sh"
)

func InitCommands(filestore filesystem.Store, socketSession *types.SocketSession, sessionStore *types.SessionStore) []sh.Command {
	return []sh.Command{
		&CmdLs{FileStore: filestore},
		&CmdMkdir{FileStore: filestore},
		&CmdCat{FileStore: filestore},
		&CmdTee{FileStore: filestore},
		CmdEcho{},
		CmdError{},
		&CmdWhoami{FileStore: filestore, Session: socketSession},
		&CmdClients{Socket: socketSession},
		&CmdSockets{SessionStore: sessionStore},
	}
}
