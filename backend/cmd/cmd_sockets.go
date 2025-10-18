package cmd

import (
	"fmt"
	"slices"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdSockets struct {
	SessionStore *types.SessionStore
}

func (c *CmdSockets) Identifier() string {
	return "sockets"
}

func (c *CmdSockets) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") {
		fmt.Fprint(ctx.Stderr, "error: not enough permissions to run this command\r\n")
		return 1
	}

	sessions := make([]*types.SocketSession, 0)

	c.SessionStore.Each(func(s *types.SocketSession) bool {
		sessions = append(sessions, s)

		return true
	})

	for _, session := range sessions {
		info := map[string]any{}
		info["socket_id"] = session.SocketID()
		info["connect_timestamp"] = session.ConnectTimestamp()

		type ClientInfo struct {
			types.ClientStatus `yaml:",inline"`
			Logs               []string `yaml:"logs"`
		}
		clients := make([]ClientInfo, 0)

		session.Each(func(status types.ClientStatus) bool {
			clients = append(clients, ClientInfo{ClientStatus: status})

			return true
		})

		for i, client := range clients {
			clients[i].Logs = session.Logs(client.ClientID)
		}

		info["clients"] = clients

		data, err := util.YamlCRLF(info)
		if err != nil {
			fmt.Fprint(ctx.Stderr, "failed to marshal session info: ", err, "\r\n")
			return 1
		}

		fmt.Fprint(ctx.Stdout, "- ")
		fmt.Fprint(ctx.Stdout, strings.ReplaceAll(string(data), "\n", "\n  "), "\r\n")
	}

	return 0
}
