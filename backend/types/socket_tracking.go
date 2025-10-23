package types

import (
	"bytes"
	"log"
	"sync"
	"time"
)

type CommandStatus struct {
	CommandStr      string     `yaml:"command"`
	Input           string     `yaml:"input"`
	Output          string     `yaml:"output"`
	Error           string     `yaml:"error"`
	RunTimestamp    time.Time  `yaml:"run_timestamp"`
	FinishTimestamp *time.Time `yaml:"finish_timestamp"`
	CommandResult   int        `yaml:"command_result"`
}

type ClientStatus struct {
	ClientID         string         `yaml:"client_id"`
	ConnectTimestamp time.Time      `yaml:"connect_timestamp"`
	CommandStatus    *CommandStatus `yaml:"command_status"`
}

func (c ClientStatus) Clone() ClientStatus {
	clone := c
	if c.CommandStatus != nil {
		new_status := *c.CommandStatus
		if new_status.FinishTimestamp != nil {
			new_finish := *new_status.FinishTimestamp
			new_status.FinishTimestamp = &new_finish
		}
		clone.CommandStatus = &new_status
	}

	return clone
}

type SocketSession struct {
	socketID         string
	authStatus       AuthorizationStatus
	clients          map[string]ClientStatus
	logs             map[string][]string
	connectTimestamp time.Time

	mu sync.RWMutex
}

func (s *SocketSession) SocketID() string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.socketID
}

func (s *SocketSession) AuthStatus() AuthorizationStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.authStatus
}

func (s *SocketSession) ClientStatus(clientID string) *ClientStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if client, ok := s.clients[clientID]; ok {
		ret := client.Clone()
		return &ret
	} else {
		return nil
	}
}

func (s *SocketSession) ClientHandle(clientID string) *ClientHandle {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if _, ok := s.clients[clientID]; ok {
		return &ClientHandle{
			clientID:      clientID,
			socketSession: s,
		}
	} else {
		return nil
	}
}

func (s *SocketSession) ConnectTimestamp() time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.connectTimestamp
}

func (s *SocketSession) Logs(clientID string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]string(nil), s.logs[clientID]...)
}

func (s *SocketSession) Each(f func(status ClientStatus) bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, status := range s.clients {
		if !f(status) {
			break
		}
	}
}

type ClientHandle struct {
	clientID      string
	socketSession *SocketSession
}

func (c ClientHandle) ClientID() string {
	return c.clientID
}

func (c ClientHandle) SocketSession() *SocketSession {
	return c.socketSession
}

func (s *SocketSession) ClientConnected(clientID string) ClientHandle {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()

	new_client := ClientStatus{
		ClientID:         clientID,
		ConnectTimestamp: now,
	}

	s.clients[clientID] = new_client
	return ClientHandle{
		clientID:      clientID,
		socketSession: s,
	}
}

func (c ClientHandle) CommandRunning(cmd string) *ClientStatus {
	now := time.Now()
	c.socketSession.mu.Lock()
	defer c.socketSession.mu.Unlock()

	if client, ok := c.socketSession.clients[c.clientID]; ok {
		client.CommandStatus = &CommandStatus{
			CommandStr:   cmd,
			RunTimestamp: now,
		}
		c.socketSession.clients[c.clientID] = client
		return &client
	} else {
		return nil
	}
}

func (c ClientHandle) CommandFinished(result int) *ClientStatus {
	now := time.Now()
	c.socketSession.mu.Lock()
	defer c.socketSession.mu.Unlock()

	if client, ok := c.socketSession.clients[c.clientID]; ok {
		if client.CommandStatus == nil {
			return &client
		}

		client.CommandStatus.CommandResult = result
		client.CommandStatus.FinishTimestamp = &now

		c.socketSession.clients[c.clientID] = client
		return &client
	} else {
		return nil
	}
}

func (c ClientHandle) Stdin(input string) *ClientStatus {
	c.socketSession.mu.Lock()
	defer c.socketSession.mu.Unlock()

	if client, ok := c.socketSession.clients[c.clientID]; ok {
		clone := client.Clone()
		if clone.CommandStatus == nil {
			return &clone
		}

		clone.CommandStatus.Input += input

		c.socketSession.clients[c.clientID] = clone
		return &clone
	} else {
		return nil
	}
}

func (c ClientHandle) Stdout(output string) *ClientStatus {
	c.socketSession.mu.Lock()
	defer c.socketSession.mu.Unlock()

	if client, ok := c.socketSession.clients[c.clientID]; ok {
		clone := client.Clone()
		if clone.CommandStatus == nil {
			return &clone
		}

		clone.CommandStatus.Output += output

		c.socketSession.clients[c.clientID] = clone
		return &clone
	} else {
		return nil
	}
}

func (c ClientHandle) Stderr(err string) *ClientStatus {
	c.socketSession.mu.Lock()
	defer c.socketSession.mu.Unlock()

	if client, ok := c.socketSession.clients[c.clientID]; ok {
		clone := client.Clone()
		if clone.CommandStatus == nil {
			return &clone
		}

		clone.CommandStatus.Error += err

		c.socketSession.clients[c.clientID] = clone
		return &clone
	} else {
		return nil
	}
}

type clientLogger struct {
	clientID      string
	socketSession *SocketSession
	buf           []byte
}

func (c *clientLogger) Write(p []byte) (int, error) {
	c.socketSession.mu.Lock()
	defer c.socketSession.mu.Unlock()

	splits := bytes.Split(p, []byte("\n"))

	if len(splits) > 1 {
		out := splits[:len(splits)-1]
		out[0] = append(c.buf, out[0]...)
		c.buf = splits[len(splits)-1]

		outStr := make([]string, len(out))
		for i, bytes := range out {
			outStr[i] = string(bytes)
		}

		c.socketSession.logs[c.clientID] = append(c.socketSession.logs[c.clientID], outStr...)
	} else {
		c.buf = append(c.buf, p...)
	}

	return len(p), nil
}

func (c ClientHandle) Logger() *log.Logger {
	return log.New(&clientLogger{
		clientID:      c.clientID,
		socketSession: c.socketSession,
		buf:           []byte{},
	}, "", log.LstdFlags)
}

func (c ClientHandle) Disconnected() {
	c.socketSession.mu.Lock()
	defer c.socketSession.mu.Unlock()

	delete(c.socketSession.clients, c.clientID)
}

type SessionStore struct {
	sessions map[string]*SocketSession
	mu       sync.RWMutex
}

func NewSessionStore() *SessionStore {
	return &SessionStore{
		sessions: map[string]*SocketSession{},
	}
}

func (s *SessionStore) AttachSession(socketID string, authStatus AuthorizationStatus) *SocketSession {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()

	new_session := &SocketSession{
		socketID:         socketID,
		authStatus:       authStatus,
		clients:          map[string]ClientStatus{},
		logs:             map[string][]string{},
		connectTimestamp: now,
	}

	s.sessions[socketID] = new_session
	return new_session
}

func (s *SessionStore) DetachSession(socketID string) *SocketSession {
	s.mu.Lock()
	defer s.mu.Unlock()

	if sess, ok := s.sessions[socketID]; ok {
		delete(s.sessions, socketID)
		return sess
	} else {
		return nil
	}
}

func (s *SessionStore) Each(f func(*SocketSession) bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, sess := range s.sessions {
		if !f(sess) {
			return
		}
	}
}
