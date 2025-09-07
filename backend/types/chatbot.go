package types

import "encoding/json"

type ContextItemType string

const (
	Message            ContextItemType = "message"
	FunctionCall       ContextItemType = "function_call"
	FunctionCallOutput ContextItemType = "function_call_output"
	ReasoningMessage   ContextItemType = "reasoning"
)

type ContextItem struct {
	Type              ContextItemType `json:"type"`
	Role              string          `json:"role,omitempty"`
	CallID            string          `json:"call_id,omitempty"`
	FunctionOutput    any             `json:"output,omitempty"`
	FunctionArguments string          `json:"arguments,omitempty"`
	Content           string          `json:"content,omitempty"`
}

type Function interface {
	GetName() string                               // name of the function
	Call(json.RawMessage) (json.RawMessage, error) // error for system-wide errors, json.RawMessage for result objects or validation errors
	GetSchema() json.RawMessage                    // schema object
}
