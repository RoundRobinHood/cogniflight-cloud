package cmd

import (
	"errors"
	"fmt"
	"log"
	"maps"
	"strings"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"mvdan.cc/sh/v3/expand"
	"mvdan.cc/sh/v3/interp"
	"mvdan.cc/sh/v3/syntax"
)

func RunClient(info types.ClientInfo, commands map[string]types.Command, filestore filesystem.Store, wg *sync.WaitGroup) {
	defer wg.Done()
	defer log.Printf("[client %q] - closing", info.Client.ClientID)
	stdin := &ChannelReader{Chan: make(chan string)}
	stdout := make(ChannelWriter)
	defer close(stdout)
	stderr := make(ChannelWriter)
	defer close(stderr)
	runner := CommandRunner{
		AuthStatus: info.Client.AuthStatus,
		Commands:   commands,
		FileStore:  filestore,
		Stdin:      stdin,
		Stdout:     stdout,
		Stderr:     stderr,
	}

	env := map[string]string{}
	maps.Copy(env, info.Client.Env)
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
				file, err := syntax.NewParser().Parse(strings.NewReader(msg.Command), "")
				if err != nil {
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandRunning,
						RefID:       msg.MessageID,
					}
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgErrorStream,
						RefID:       msg.MessageID,

						ErrorStream: fmt.Sprintf("invalid command: %v", err),
					}
					result := 1
					info.Client.Out <- types.WebSocketMessage{
						MessageID:   GenerateMessageID(20),
						ClientID:    info.Client.ClientID,
						MessageType: types.MsgCommandFinished,
						RefID:       msg.MessageID,

						CommandResult: &result,
					}
					continue
				}

				cmd_stop := make(chan struct{})
				cmd_wg := new(sync.WaitGroup)
				cmd_wg.Add(3)
				go func() {
					defer cmd_wg.Done()
					for {
						select {
						case <-cmd_stop:
							return
						case msg := <-info.Client.In:
							switch msg.MessageType {
							case types.MsgInputStream:
								if msg.InputStream != "" {
									stdin.Chan <- msg.InputStream
								}
							case types.MsgInputEOF:
								close(stdin.Chan)
								return
							}
						}
					}
				}()
				go func() {
					defer cmd_wg.Done()
					for {
						select {
						case <-cmd_stop:
							return
						case str := <-stdout:
							info.Client.Out <- types.WebSocketMessage{
								MessageID:   GenerateMessageID(20),
								ClientID:    info.Client.ClientID,
								MessageType: types.MsgOutputStream,
								RefID:       msg.MessageID,

								OutputStream: str,
							}
						}
					}
				}()
				go func() {
					defer cmd_wg.Done()
					for {
						select {
						case <-cmd_stop:
							return
						case str := <-stderr:
							info.Client.Out <- types.WebSocketMessage{
								MessageID:   GenerateMessageID(20),
								ClientID:    info.Client.ClientID,
								MessageType: types.MsgErrorStream,
								RefID:       msg.MessageID,

								ErrorStream: str,
							}
						}
					}
				}()

				log.Printf("Providing stdin: %v", stdin)
				info.Client.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    info.Client.ClientID,
					MessageType: types.MsgCommandRunning,
					RefID:       msg.MessageID,
				}
				if runner_err := runner.InitRunner(env); runner_err != nil {
					fmt.Fprintf(stderr, "Failed to init command runner")
					log.Printf("Failed to init command runner: %v\n", runner_err)
					err = interp.ExitStatus(1)
				} else {
					err = runner.Runner.Run(info.Ctx, file)

					runner.Runner.Env.Each(func(name string, vr expand.Variable) bool {
						env[name] = vr.String()
						return true
					})
					runner.Runner = nil
				}

				close(cmd_stop)
				cmd_wg.Wait()

				stdin.Chan = make(chan string)

				result := 0
				if err != nil {
					var exit interp.ExitStatus
					if errors.As(err, &exit) {
						result = int(exit)
					} else {
						log.Printf("Runner error: %v\n", err)
						info.Client.Out <- types.WebSocketMessage{
							MessageID:   GenerateMessageID(20),
							ClientID:    info.Client.ClientID,
							MessageType: types.MsgErrorStream,
							RefID:       msg.MessageID,

							ErrorStream: err.Error(),
						}
					}
				}

				info.Client.Out <- types.WebSocketMessage{
					MessageID:   GenerateMessageID(20),
					ClientID:    info.Client.ClientID,
					MessageType: types.MsgCommandFinished,
					RefID:       msg.MessageID,

					CommandResult: &result,
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
