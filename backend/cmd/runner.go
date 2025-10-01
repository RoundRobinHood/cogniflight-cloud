package cmd

import (
	"context"
	"fmt"
	"io"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"mvdan.cc/sh/v3/expand"
	"mvdan.cc/sh/v3/interp"
)

type CommandRunner struct {
	AuthStatus     types.AuthorizationStatus
	Commands       map[string]types.Command
	FileStore      filesystem.Store
	Stdin          io.Reader
	Stdout, Stderr io.Writer
	Runner         *interp.Runner
}

func (c *CommandRunner) InitRunner(env map[string]string) error {
	formatted := make([]string, 0, len(env))
	for key, value := range env {
		formatted = append(formatted, fmt.Sprintf("%s=%s", key, value))
	}

	environ := expand.ListEnviron(formatted...)

	runner, err := interp.New(
		interp.StdIO(c.Stdin, c.Stdout, c.Stderr),
		interp.OpenHandler(c.FileStore.OpenHandler(c.AuthStatus.Tags)),
		interp.StatHandler(c.FileStore.StatHandler(c.AuthStatus.Tags)),
		interp.ExecHandlers(func(next interp.ExecHandlerFunc) interp.ExecHandlerFunc {
			return func(ctx context.Context, args []string) error {
				handlerCtx := interp.HandlerCtx(ctx)

				env := map[string]string{}
				handlerCtx.Env.Each(func(name string, vr expand.Variable) bool {
					env[name] = vr.Str
					return true
				})

				if cmd, ok := c.Commands[args[0]]; ok {
					result := cmd.Run(types.CommandContext{
						Args:       args,
						Stdin:      handlerCtx.Stdin,
						Stdout:     handlerCtx.Stdout,
						Stderr:     handlerCtx.Stderr,
						Env:        env,
						Ctx:        ctx,
						AuthStatus: c.AuthStatus,
						ParentTags: c.AuthStatus.Tags,
					})

					if result != 0 {
						return interp.ExitStatus(result)
					}

					return nil
				}

				fmt.Fprintf(handlerCtx.Stderr, "command does not exist")
				return interp.ExitStatus(1)
			}
		}),
		interp.Env(environ),
	)

	if err != nil {
		return err
	}

	c.Runner = runner
	return nil
}
