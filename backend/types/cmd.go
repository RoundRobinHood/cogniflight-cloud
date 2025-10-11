package types

import (
	"context"
	"sync"
)

type MessageType string

const (
	// Client connect/disconnect
	MsgConnect       MessageType = "connect"
	MsgConnectAck    MessageType = "connect_acknowledged"
	MsgDisconnect    MessageType = "disconnect"
	MsgDisconnectAck MessageType = "disconnect_acknowledged"

	// Command passing
	MsgRunCommand      MessageType = "run_command"
	MsgCommandRunning  MessageType = "command_running"
	MsgCommandFinished MessageType = "command_finished"
	MsgSetEnv          MessageType = "set_env"

	// Stdout
	MsgOutputStream MessageType = "output_stream"

	// Stdin
	MsgInputStream MessageType = "input_stream"
	MsgInputEOF    MessageType = "stdin_eof"

	// Stderr
	MsgErrorStream MessageType = "error_stream"

	// Error response
	MsgErrResponse MessageType = "err_response"
)

// WebSocketMessage is transmitted as JSON in duplex communication with the browser
type WebSocketMessage struct {
	// MessageID is a random 20-digit hex string for reference
	MessageID string `msgpack:"message_id,omitempty" json:"message_id,omitempty"`
	// RefID is used to reference a MessageID while responding
	RefID string `msgpack:"ref_id,omitempty" json:"ref_id,omitempty"`
	// MessageType dictates the specific kind of message that's being sent
	MessageType MessageType `msgpack:"message_type" json:"message_type"`
	// ClientID is a browser-generated string identifying a client connection
	ClientID string `msgpack:"client_id,omitempty" json:"client_id,omitempty"`

	// Command is the specific command string
	Command string `msgpack:"command,omitempty" json:"command,omitempty"`
	// OutputStream is where the server places output when it's being streamed out
	OutputStream string `msgpack:"output_stream,omitempty" json:"output_stream,omitempty"`
	// InputStream is where the client places input when it's being streamed in
	InputStream string `msgpack:"input_stream,omitempty" json:"input_stream,omitempty"`
	// ErrorStream is where the server streams a command's error output
	ErrorStream string `msgpack:"error_stream,omitempty" json:"error_stream,omitempty"`
	// CommandResult refers to the numeric exit code of the command. 0 is success, non-zero is failure
	CommandResult *int `msgpack:"command_result,omitempty" json:"command_result,omitempty"`

	// SetEnv can be sent by either the client or the server to update the shared environment
	SetEnv map[string]string `msgpack:"set_env,omitempty" json:"set_env,omitempty"`

	// Error is where system errors are placed
	// That includes invalid JSON, unknown ClientID, etc
	// It does not include command-specific errors. Those are sent in the ErrorStream
	Error string `msgpack:"error,omitempty" json:"error,omitempty"`
}

type Client struct {
	ClientID   string
	Env        map[string]string
	In         <-chan WebSocketMessage
	Out        chan WebSocketMessage
	AuthStatus AuthorizationStatus
	UserTags   []string
}

type ClientInfo struct {
	Client         Client
	Ctx            context.Context
	InputWaitGroup *sync.WaitGroup
	ClientHandle   ClientHandle
}

type OptionDescriptor struct {
	// Identifier is the back-end name for the option
	Identifier string

	// Aliases should not include dashes. If len() = 1, it's a single-dash flag.
	// If len() > 1, it's a double-dash flag
	Aliases []string

	// If Default is true/false, the option is a flag. If it's a string, the option takes a parameter
	Default any
}
