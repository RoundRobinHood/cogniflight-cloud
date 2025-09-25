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

func (cmd CmdWhoami) Run(ctx types.CommandContext) int {
	out := CRLFChannel(ctx.Out)
	defer close(out)
	defer func() {
		log.Println("Exiting whoami")
	}()

	if ctx.AuthStatus.Key == nil && ctx.AuthStatus.Sess == nil {
		new_ctx := ctx
		new_ctx.Args = []string{"error", "error: no authorisation status"}
		return CmdError{}.Run(new_ctx)
	}

	if ctx.AuthStatus.Key != nil {
		var bytes []byte
		if ctx.AuthStatus.Key.EdgeID != nil {
			bytes, _ = yaml.Marshal(map[string]string{"type": "edge_node", "edge_id": ctx.AuthStatus.Key.ID.Hex()})
		} else {
			bytes, _ = yaml.Marshal(map[string]string{"type": "api_key"})
		}

		echo_ctx := ctx
		echo_ctx.Args = []string{"echo", string(bytes)}
		echo_ctx.Out = out
		return CmdEcho{}.Run(echo_ctx)
	} else {
		cmd_ctx, cancel := context.WithCancel(context.Background())

		stop_ctxch := make(chan struct{})
		defer close(stop_ctxch)
		go func() {
			defer cancel()
			for {
				select {
				case <-stop_ctxch:
					return
				case incoming := <-ctx.In:
					if incoming.MessageType == types.MsgInputEOF {
						return
					}
				}
			}
		}()

		if user, err := cmd.Store.GetUserByID(ctx.AuthStatus.Sess.UserID, cmd_ctx); err != nil {
			log.Println("Error fetching user: ", err)
			error_ctx := ctx
			error_ctx.Args = []string{"error", "error: couldnt fetch user"}
			return CmdError{}.Run(error_ctx)
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
				error_ctx := ctx
				error_ctx.Args = []string{"error", "error: couldnt fetch user"}
				return CmdError{}.Run(error_ctx)
			} else {
				echo_ctx := ctx
				echo_ctx.Args = []string{"echo", string(bytes)}
				echo_ctx.Out = out
				return CmdEcho{}.Run(echo_ctx)
			}
		}
	}
}
