package cmd

import (
	"context"
	"fmt"
	"io"
	"log"
	"slices"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/reversed_rpc"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdEdgeCat struct {
	Registry *reversed_rpc.RPCRegistry
}

func (c *CmdEdgeCat) Identifier() string {
	return "edge-cat"
}

func (c *CmdEdgeCat) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)
	if !slices.Contains(tags, "sysadmin") {
		fmt.Fprint(ctx.Stderr, "error: access denied")
		return 1
	}

	if len(ctx.Args) == 1 {
		fmt.Fprint(ctx.Stderr, "usage: edge-cat <edge-username>")
		return 1
	}

	if call, err := c.Registry.Call(ctx.Args[1], "cat"); err != nil {
		fmt.Fprint(ctx.Stderr, "failed to get call handle: ", err)
		return 1
	} else {
		log.Println("Have call, callID: ", call.CallID)
		callCtx, cancel := context.WithCancel(ctx.Ctx)
		defer cancel()
		defer call.EventListener.Unsubscribe()
		go func() {
			<-call.Ctx.Done()
			cancel()
		}()
		defer func() {
			call.SendingChannel.In() <- types.WebSocketMessage{
				MessageID: util.RandHex(20),
				RefID: call.CallID,
				MessageType: types.MsgCommandInterrupt,
			}
		}()

		go func() {
			buf := make([]byte, 200)
			for {
				if n, err := ctx.Stdin.Read(buf); err != nil {
					cancel()
					if err == io.EOF {
						return
					} else {
						log.Println("Failed to read from stdin: ", err)
					}
				} else {
					log.Println("received: ", string(buf[:n]))
					call.SendingChannel.In() <- types.WebSocketMessage{
						MessageID: util.RandHex(20),
						RefID: call.CallID,
						MessageType: types.MsgInputStream,

						InputStream: string(buf[:n]),
					}
				}
				select {
				case <-callCtx.Done():
					return
				default:
				}
			}
		}()

		for {
			select {
			case <-callCtx.Done():
				return 0
			case incoming := <-call.EventListener.Out():
				if incoming.RefID == call.CallID && incoming.MessageType == types.MsgOutputStream {
					fmt.Fprint(ctx.Stdout, incoming.OutputStream)
				}
			}
		}
	}
}
