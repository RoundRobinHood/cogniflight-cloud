package cmd

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/chatbot"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/sh"
	"github.com/sourcegraph/jsonrpc2"
)

func InitCommands(filestore filesystem.Store, socketSession *types.SocketSession, sessionStore *types.SessionStore, apiKey chatbot.APIKey, jsonConn *jsonrpc2.Conn) []sh.Command {
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
		CmdHelp{},
		CmdMLRPC{Conn: jsonConn},
		&CmdEmbed{Conn: jsonConn, FileStore: filestore},
	}

	activate_cmd := &CmdActivate{
		APIKey:    apiKey,
		FileStore: filestore,
	}

	commands = append(commands, activate_cmd)
	activate_cmd.Commands = commands

	return commands
}
