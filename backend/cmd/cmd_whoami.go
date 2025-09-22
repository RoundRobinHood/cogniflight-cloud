package cmd

import (
	"context"
	"log"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/goccy/go-yaml"
)

type CmdWhoami struct {
	Store types.UserStore
}

func (CmdWhoami) Identifier() string {
	return "whoami"
}

func (cmd CmdWhoami) Run(args []string, in, out chan types.WebSocketMessage, env map[string]string, stopChannel chan struct{}, ClientID, CommandMsgID string, auth_status types.AuthorizationStatus) int {
	out = CRLFChannel(out)
	defer close(out)
	defer func() {
		log.Println("Exiting whoami")
	}()

	if auth_status.Key == nil && auth_status.Sess == nil {
		return CmdError{}.Run([]string{"error", "error: no authorization status"}, in, out, env, stopChannel, ClientID, CommandMsgID, auth_status)
	}

	if auth_status.Key != nil {
		var bytes []byte
		if auth_status.Key.EdgeID != nil {
			bytes, _ = yaml.Marshal(map[string]string{"type": "edge_node", "edge_id": auth_status.Key.ID.Hex()})
		} else {
			bytes, _ = yaml.Marshal(map[string]string{"type": "api_key"})
		}

		return CmdEcho{}.Run([]string{"echo", string(bytes)}, in, out, env, stopChannel, ClientID, CommandMsgID, auth_status)
	} else {
		ctx, cancel := context.WithCancel(context.Background())

		stop_ctxch := make(chan struct{})
		defer close(stop_ctxch)
		go func() {
			defer cancel()
			for {
				select {
				case <-stop_ctxch:
					return
				case incoming := <-in:
					if incoming.MessageType == types.MsgInputEOF {
						return
					}
				}
			}
		}()

		if user, err := cmd.Store.GetUserByID(auth_status.Sess.UserID, ctx); err != nil {
			log.Println("Error fetching user: ", err)
			return CmdError{}.Run([]string{"error", "error: couldnt fetch user"}, in, out, env, stopChannel, ClientID, CommandMsgID, auth_status)
		} else {
			var ret struct {
				Type           string `yaml:"type"`
				types.UserInfo `yaml:",inline"`
			}

			ret.Type = "user"
			ret.UserInfo = types.UserInfo{
				ID:    user.ID,
				Name:  user.Name,
				Email: user.Email,
				Phone: user.Phone,
				Role:  user.Role,
			}

			if bytes, err := yaml.Marshal(ret); err != nil {
				log.Println("Couldn't marshal whoami response: ", err)
				return CmdError{}.Run([]string{"error", "error: couldnt fetch user"}, in, out, env, stopChannel, ClientID, CommandMsgID, auth_status)
			} else {
				return CmdEcho{}.Run([]string{"echo", string(bytes)}, in, out, env, stopChannel, ClientID, CommandMsgID, auth_status)
			}
		}
	}
}
