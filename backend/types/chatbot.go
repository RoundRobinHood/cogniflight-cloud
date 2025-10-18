package types

import "encoding/json"

type ContextItemType string

const (
	Message            ContextItemType = "message"
	FunctionCall       ContextItemType = "function_call"
	FunctionCallOutput ContextItemType = "function_call_output"
	ReasoningMessage   ContextItemType = "reasoning"
)

type ContentItemType string

const (
	InputText  ContentItemType = "input_text"
	OutputText ContentItemType = "output_text"
)

type ContentItem struct {
	Type ContentItemType `json:"type"`
	Text string          `json:"text,omitempty"`
}

type ContextItem struct {
	Type ContextItemType `json:"type"`
	ID   string          `json:"id,omitempty"`

	Name              string `json:"name,omitempty"`
	CallID            string `json:"call_id,omitempty"`
	FunctionOutput    string `json:"output,omitempty"`
	FunctionArguments string `json:"arguments,omitempty"`

	Content []ContentItem `json:"content,omitempty"`
	Role    string        `json:"role,omitempty"`
}

type Function interface {
	GetName() string                               // name of the function
	Call(json.RawMessage) (json.RawMessage, error) // error for system-wide errors, json.RawMessage for result objects or validation errors
	GetSchema() json.RawMessage                    // schema object
}

type OpenAIResponse struct {
	ID     string        `json:"id"`
	Status string        `json:"status"`
	Model  string        `json:"model"`
	Output []ContextItem `json:"output"`
}

// ToolDefinition is strictly for function calls right now
type ToolDefinition struct {
	Type        string          `json:"type"` // "function"
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Parameters  json.RawMessage `json:"parameters"`
}

type ResponseRequest struct {
	PreviousResponseID string           `json:"previous_response_id,omitempty"`
	Model              string           `json:"model"`
	Input              []ContextItem    `json:"input"`
	Tools              []ToolDefinition `json:"tools"`
	ToolChoice         string           `json:"tool_choice,omitempty"`
	Stream             bool             `json:"stream"`
	Instructions       string           `json:"instructions"`
}

type ResponseStreamEvent struct {
	Type           string `json:"type"`
	SequenceNumber int    `json:"sequence_number"`

	OutputIndex  int `json:"output_index"`
	ContentIndex int `json:"content_index"`

	ItemID  string `json:"item_id"`
	Delta   string `json:"delta"`
	Text    string `json:"text"`
	Refusal string `json:"refusal"`

	Response OpenAIResponse `json:"response"`
	Item     ContextItem    `json:"item"`
	Part     ContentItem    `json:"part"`
}
