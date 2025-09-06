package types

type InputItemType string

const (
	Message            InputItemType = "message"
	FunctionCall       InputItemType = "function_call"
	FunctionCallOutput InputItemType = "function_call_output"
)

type InputItem struct {
	Type           InputItemType `json:"type"`
	Role           string
	CallID         string `json:"call_id"`
	FunctionOutput any    `json:"output"`
}
