package cmd

import (
	"fmt"
	"log"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

func RunClient(info types.ClientInfo, commands map[string]types.Command, wg *sync.WaitGroup) {
	defer wg.Done()
	defer log.Printf("[client %q] - closing", info.Client.ClientID)
	for {
		fmt.Println(info.Client.In)
		select {
		case <-info.Ctx.Done():
			go func() {
				for range info.Client.In {
				}
			}()
			info.InputWaitGroup.Wait()
			return
		case msg := <-info.Client.In:
			log.Printf("[client %q] - received msg: %v", info.Client.ClientID, msg)
			switch msg.MessageType {
			case types.MsgRunCommand:
				args, err := ParseCommand(msg.Command)
				if err != nil {
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandRunning,
						RefID:       msg.MessageID,
					}
					result := commands["error"].Run(types.CommandContext{
						Args:         []string{"error", fmt.Sprintf("invalid command string: %v", err)},
						In:           info.Client.In,
						Out:          info.Client.Out,
						Env:          info.Client.Env,
						Ctx:          info.Ctx,
						CommandMsgID: msg.MessageID,
						ClientID:     info.Client.ClientID,
						AuthStatus:   info.Client.AuthStatus,
						ParentTags:   info.Client.UserTags,
					})
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandFinished,
						RefID:       msg.MessageID,

						CommandResult: &result,
					}
					continue
				}

				for i := range len(args) {
					if len(args[i]) > 0 {
						args = args[i:]
						break
					}
				}

				if len(args[0]) == 0 {
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandRunning,
						RefID:       msg.MessageID,
					}
					result := commands["error"].Run(types.CommandContext{
						Args:         []string{"error", "invalid command string: no command identifier"},
						In:           info.Client.In,
						Out:          info.Client.Out,
						Env:          info.Client.Env,
						Ctx:          info.Ctx,
						CommandMsgID: msg.MessageID,
						ClientID:     info.Client.ClientID,
						AuthStatus:   info.Client.AuthStatus,
						ParentTags:   info.Client.UserTags,
					})
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandFinished,
						RefID:       msg.MessageID,

						CommandResult: &result,
					}
					continue
				}

				if cmd, ok := commands[args[0]]; ok {
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandRunning,
						RefID:       msg.MessageID,
					}
					result := cmd.Run(types.CommandContext{
						Args:         args,
						In:           info.Client.In,
						Out:          info.Client.Out,
						Env:          info.Client.Env,
						Ctx:          info.Ctx,
						CommandMsgID: msg.MessageID,
						ClientID:     info.Client.ClientID,
						AuthStatus:   info.Client.AuthStatus,
						ParentTags:   info.Client.UserTags,
					})
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandFinished,
						RefID:       msg.MessageID,

						CommandResult: &result,
					}
					continue
				} else {
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandRunning,
						RefID:       msg.MessageID,
					}
					result := commands["error"].Run(types.CommandContext{
						Args:         []string{"error", fmt.Sprintf("unknown command: %q", args[0])},
						In:           info.Client.In,
						Out:          info.Client.Out,
						Env:          info.Client.Env,
						Ctx:          info.Ctx,
						CommandMsgID: msg.MessageID,
						ClientID:     info.Client.ClientID,
						AuthStatus:   info.Client.AuthStatus,
						ParentTags:   info.Client.UserTags,
					})
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandFinished,
						RefID:       msg.MessageID,

						CommandResult: &result,
					}
					continue
				}

			case types.MsgDisconnect:
				go func() {
					for range info.Client.In {
					}
				}()
				info.InputWaitGroup.Wait()
				info.Client.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    info.Client.ClientID,
					MessageType: types.MsgDisconnectAck,
					RefID:       msg.MessageID,
				}

				return
			}
		}
	}
}
