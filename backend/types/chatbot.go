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
	Type              ContextItemType `bson:"type" json:"type"`
	Role              string          `bson:"role,omitempty" json:"role,omitempty"`
	CallID            string          `bson:"call_id,omitempty" json:"call_id,omitempty"`
	FunctionOutput    any             `bson:"output,omitempty" json:"output,omitempty"`
	FunctionArguments string          `bson:"arguments,omitempty" json:"arguments,omitempty"`
	Content           string          `bson:"content,omitempty" json:"content,omitempty"`
}

type Function interface {
	GetName() string                               // name of the function
	Call(json.RawMessage) (json.RawMessage, error) // error for system-wide errors, json.RawMessage for result objects or validation errors
	GetSchema() json.RawMessage                    // schema object
}
