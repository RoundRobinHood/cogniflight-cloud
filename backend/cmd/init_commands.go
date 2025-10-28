package cmd

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/chatbot"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/email"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/influx"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/uazapi"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"github.com/sourcegraph/jsonrpc2"
)

func InitCommands(
	filestore filesystem.Store,
	fsctx filesystem.FSContext,
	socketSession *types.SocketSession,
	sessionStore *types.SessionStore,
	apiKey chatbot.APIKey,
	jsonConn *jsonrpc2.Conn,
	mqttEvents *util.EventHandler[types.MQTTMessage],
	flux_cfg *influx.InfluxDBConfig,
	uazapi_cfg uazapi.UazapiConfig,
	email_cfg email.EmailConfig,
) []sh.Command {
	commands := []sh.Command{
		&CmdWhoami{FileStore: filestore, Session: socketSession},
		CmdHelp{},
		&CmdChangePassword{FileStore: filestore},
		&CmdLogout{FileStore: filestore},

		CmdEcho{},
		CmdError{},
		CmdHeartbeat{},

		&CmdLs{FileStore: filestore},
		&CmdMkdir{FileStore: filestore},
		&CmdCat{FSCtx: fsctx},
		&CmdTee{FileStore: filestore},
		&CmdRm{FileStore: filestore},
		&CmdMv{FileStore: filestore},
		&CmdChmod{FileStore: filestore},
		&CmdCopy{FileStore: filestore},

		&CmdEmbed{Conn: jsonConn, FileStore: filestore},
		CmdCryptoRand{},

		&CmdClients{Socket: socketSession},
		&CmdSockets{SessionStore: sessionStore},

		&CmdPilots{FileStore: filestore},
		&CmdEdgeNodes{FileStore: filestore},

		CmdMLRPC{Conn: jsonConn},
		CmdFluxStream{FluxCfg: flux_cfg},
		&CmdMQTT{Events: mqttEvents},
		&CmdFinishFlight{FileStore: filestore},

		CmdB64{},
		CmdHex{},

		&CmdSendText{UazapiConfig: uazapi_cfg},
		CmdEmail{EmailConfig: email_cfg},
	}

	activate_cmd := &CmdActivate{
		APIKey:    apiKey,
		FileStore: filestore,
	}

	commands = append(commands, activate_cmd)
	activate_cmd.Commands = commands

	return commands
}
