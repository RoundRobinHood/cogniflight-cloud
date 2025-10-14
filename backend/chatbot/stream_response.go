package chatbot

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type APIKey string

func (k APIKey) StreamResponse(requestObj types.ResponseRequest, output io.Writer) (*types.OpenAIResponse, error) {
	requestObj.Stream = true
	if requestObj.ToolChoice == "" {
		requestObj.ToolChoice = "auto"
	}

	data, err := json.Marshal(requestObj)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/responses", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+string(k))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to do request: %v", err)
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	var responseObj types.OpenAIResponse
	var currentEvent string

	for scanner.Scan() {
		line := scanner.Text()
		log.Println("received: ", line)

		if event, ok := strings.CutPrefix(line, "event: "); ok {
			currentEvent = event
			continue
		}

		if strings.HasPrefix(line, "data: ") {
			var event types.ResponseStreamEvent
			if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &event); err != nil {
				continue
			}

			switch currentEvent {
			case "response.created", "response.in_progress", "response.completed", "response.failed", "response.incomplete":
				responseObj = event.Response
			case "response.output_text.delta":
				crlf := strings.ReplaceAll(event.Delta, "\n", "\r\n")
				output.Write([]byte(crlf))
			case "response.content_part.done", "response.refusal.done":
				output.Write([]byte("\r\n"))
			case "response.refusal.delta":
				crlf := strings.ReplaceAll(event.Delta, "\n", "\r\n")
				output.Write([]byte("\x1b[31m" + crlf + "\x1b[0m"))
			}
		}
	}

	return &responseObj, nil
}
