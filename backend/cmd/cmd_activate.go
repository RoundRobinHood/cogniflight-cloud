package cmd

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"maps"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/chatbot"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
)

type CmdActivate struct {
	APIKey    chatbot.APIKey
	Commands  []sh.Command
	FileStore filesystem.Store
}

func (c *CmdActivate) Identifier() string {
	return "activate"
}

func (c *CmdActivate) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	scanner := bufio.NewScanner(ctx.Stdin)

	fmt.Fprint(ctx.Stdout, "Hi, I'm Bob\r\n")
	response_id := ""

	stdout := bytes.Buffer{}
	stderr := bytes.Buffer{}
	runner := &sh.Runner{
		Env:      map[string]string{},
		Commands: c.Commands,
		Stdin:    strings.NewReader(""),
		Stdout:   &stdout,
		Stderr:   &stderr,
		FS: &filesystem.FSContext{
			Store:    c.FileStore,
			UserTags: tags,
		},
	}

	maps.Copy(runner.Env, ctx.Env)

	type CmdRun struct {
		Command string `json:"command"`
	}
	type FunctionError struct {
		Error string `json:"error"`
	}
	type CommandResult struct {
		Stdout string `json:"stdout"`
		Stderr string `json:"stderr"`
		Result int    `json:"result"`
		Error  string `json:"error,omitempty"`
	}

	cmd_run_schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"command": map[string]any{
				"type":        "string",
				"description": "The command string, such as 'echo hi | cat' or 'cd ..'",
			},
		},
		"required": []string{"command"},
	}

	cmd_run_schema_bytes, err := json.Marshal(cmd_run_schema)
	if err != nil {
		fmt.Fprint(ctx.Stderr, "Failed to marshal command-run tool schema: ", err)
		return 1
	}

	for {
		fmt.Fprint(ctx.Stdout, "\x1b[34m[ Ask Bob ] \x1b[0m")
		if !scanner.Scan() {
			break
		}

		line := scanner.Text()
		inputs := []types.ContextItem{
			{
				Type: types.Message,
				Role: "user",
				Content: []types.ContentItem{
					{
						Type: types.InputText,
						Text: line,
					},
				},
			},
		}

		for len(inputs) > 0 {
			resp, err := c.APIKey.StreamResponse(types.ResponseRequest{
				PreviousResponseID: response_id,
				Model:              "gpt-4o-mini",
				Input:              inputs,
				Tools: []types.ToolDefinition{
					{
						Type:        "function",
						Name:        "run_command",
						Description: "Run a command in our bash DSL",
						Parameters:  cmd_run_schema_bytes,
					},
				},
			}, ctx.Stdout)
			if err != nil {
				fmt.Fprint(ctx.Stderr, "Failed to stream response from OpenAI: ", err)
				return 1
			}
			fmt.Fprint(ctx.Stdout, "\r\n")

			response_id = resp.ID

			inputs = make([]types.ContextItem, 0)
			for _, item := range resp.Output {
				if item.Type == types.FunctionCall {
					switch item.Name {
					case "run_command":
						stdout.Reset()
						stderr.Reset()
						var args CmdRun
						if err := json.Unmarshal([]byte(item.FunctionArguments), &args); err != nil {
							inputs = append(inputs, types.ContextItem{
								Type:           types.FunctionCallOutput,
								CallID:         item.CallID,
								FunctionOutput: fmt.Sprintf(`{"error": %q}`, "invalid JSON: "+err.Error()),
							})
						} else {
							log.Println("Chatbot is running command: ", args.Command)
							err := runner.RunText(ctx.Ctx, strings.NewReader(args.Command))
							result := 0
							errStr := ""
							if err != nil {
								var exitStatus sh.ExitStatus
								if errors.As(err, &exitStatus) {
									result = int(exitStatus)
								} else {
									errStr = fmt.Sprintf("error running command: %v", err)
								}
							}

							data, _ := json.Marshal(CommandResult{
								Result: result,
								Error:  errStr,

								Stdout: stdout.String(),
								Stderr: stderr.String(),
							})
							inputs = append(inputs, types.ContextItem{
								Type:           types.FunctionCallOutput,
								CallID:         item.CallID,
								FunctionOutput: string(data),
							})
						}
					default:
						inputs = append(inputs, types.ContextItem{
							Type:           types.FunctionCallOutput,
							CallID:         item.CallID,
							FunctionOutput: `{"error": "unknown function name"}`,
						})
					}
				}

			}
			log.Println("New inputs: ", inputs)
		}
	}

	fmt.Fprint(ctx.Stdout, "\r\nBye!")

	return 0
}
