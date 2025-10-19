package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
	"sync"
	"time"

	"sync/atomic"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/cmd"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
	"golang.org/x/term"
)

type AtomicFlag struct {
	flag int32
}

func (f *AtomicFlag) Set(value bool) {
	var v int32
	if value {
		v = 1
	}
	atomic.StoreInt32(&f.flag, v)
}

func (f *AtomicFlag) Get() bool {
	return atomic.LoadInt32(&f.flag) != 0
}

func main() {
	oldState, err := term.MakeRaw(int(os.Stdin.Fd()))
	if err != nil {
		log.Fatal("Error setting terminal to raw:", err)
	}
	defer term.Restore(int(os.Stdin.Fd()), oldState)

	if len(os.Args) == 0 {
		os.Exit(1)
	}
	if len(os.Args) == 1 {
		fmt.Printf("Usage: %s <API_URL>\r\n", os.Args[0])
		return
	}

	api_url := os.Args[1]

	scheme, _, found := strings.Cut(api_url, ":")
	if !found || (scheme != "http" && scheme != "https") {
		fmt.Print("URL format: http(s)://domain(:port)\r\n")
		return
	}
	env := &sync.Map{}

	ws_url := strings.Replace(api_url, "http", "ws", 1)

	// done is closed when the program can't go on anymore (typically means websocket disconnected)
	done := make(chan struct{})

	// Set up input line reader
	should_echo := &AtomicFlag{}
	shortcuts_in := make(chan string)
	lines_in := make(chan string)
	go func() {
		// Exhaust the input stuff if the done channel is closed
		go func() {
			for range done {
			}

			go func() {
				for range lines_in {
				}
			}()
			go func() {
				for range shortcuts_in {
				}
			}()
		}()

		input := make([]byte, 1)
		line := ""
		in_wg := new(sync.WaitGroup)
		for {
			select {
			case <-done:
				in_wg.Wait()
				fmt.Print("stopped reading input...\r\n")
				return
			default:
			}

			n, err := os.Stdin.Read(input)
			if err != nil {
				fmt.Print("Stdin read error:", err, "\r\n")
				close(done)
				return
			}
			if n == 0 {
				continue
			}

			b := input[0]
			switch b {
			case 0x04:
				in_wg.Add(1)
				go func() {
					defer in_wg.Done()
					shortcuts_in <- "ctrl+d"
				}()
			case 0x03:
				in_wg.Add(1)
				go func() {
					defer in_wg.Done()
					shortcuts_in <- "ctrl+c"
				}()
			case 0x7f:
				if len(input) > 0 {
					line = line[:len(line)-1]
					if should_echo.Get() {
						fmt.Print("\b \b")
					}
				}
			case '\r', '\n':
				if should_echo.Get() {
					fmt.Print("\r\n")
				}
				in_wg.Add(1)
				go func(line string) {
					defer in_wg.Done()
					lines_in <- strings.TrimRight(line, "\r\n")
				}(line)
				line = ""
			default:
				if should_echo.Get() {
					fmt.Print(string(b))
				}
				line += string(b)
			}
		}
	}()

	prompt_ch := make(chan struct{})
	go func() {
		for {
			select {
			case <-prompt_ch:
				return
			case shortcut := <-shortcuts_in:
				if shortcut == "ctrl+d" {
					fmt.Print("prompt interrupted", "\r\n")
					close(done)
					return
				}
			}
		}
	}()

	fmt.Print("username: ")
	should_echo.Set(true)
	username := ""
	select {
	case username = <-lines_in:
	case <-done:
		return
	}
	should_echo.Set(false)
	fmt.Print("password: ")
	pwd := ""
	select {
	case pwd = <-lines_in:
	case <-done:
		return
	}
	fmt.Print("\r\n")
	close(prompt_ch)

	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar: jar,
	}
	body := fmt.Sprintf(`{"username": %q, "password": %q}`, username, pwd)
	resp, err := client.Post(api_url+"/login", "application/json", strings.NewReader(body))
	if err != nil {
		fmt.Print("Login request error:", err, "\r\n")
		close(done)
		return
	}
	if resp.StatusCode == 401 {
		fmt.Print("Incorrect username/password", err, "\r\n")
		close(done)
		return
	}
	if resp.StatusCode != 200 {
		resp_bytes, _ := io.ReadAll(resp.Body)
		fmt.Printf("Non-200 login status: %d. Body: \r\n%s\r\n", resp.StatusCode, string(resp_bytes))
		close(done)
		return
	}
	resp.Body.Close()

	websocket.DefaultDialer.Jar = jar
	conn, _, err := websocket.DefaultDialer.Dial(ws_url+"/cmd-socket", nil)
	if err != nil {
		fmt.Print("Websocket dial error:", err, "\r\n")
		close(done)
		return
	}
	defer conn.Close()

	wg := new(sync.WaitGroup)
	in, out := make(chan types.WebSocketMessage), make(chan types.WebSocketMessage)

	// Set up sender
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-done:
				fmt.Print("sender closed\r\n")
				close(out)
				return
			case send := <-out:
				bytes, _ := msgpack.Marshal(send)
				if err := conn.WriteMessage(websocket.BinaryMessage, bytes); err != nil {
					fmt.Print("write error:", err, "\r\n")
					close(done)
					return
				}
			}
		}
	}()

	clientID := "term-1"

	// Set up receiver
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-done:
				fmt.Print("receiver closed\r\n")
				return
			default:
			}

			messageType, msg, err := conn.ReadMessage()
			if err != nil {
				fmt.Print("read error:", err, "\r\n")
				close(done)
				return
			}
			if messageType != websocket.BinaryMessage {
				fmt.Print("Received non-binary message:", string(msg), "\r\n")
				close(done)
				return
			}

			var ws_message types.WebSocketMessage
			if err := msgpack.Unmarshal(msg, &ws_message); err != nil {
				fmt.Print("Can't unmarshal message:", err, "\r\n")
				close(done)
				return
			}

			if ws_message.ClientID != clientID {
				fmt.Print("Server sent wrong client_id:", ws_message.ClientID, "\r\n")
				close(done)
				return
			}

			if ws_message.SetEnv != nil {
				for key, value := range ws_message.SetEnv {
					env.Store(key, value)
				}
			}

			in <- ws_message
		}
	}()

	// Connect a client
	out <- types.WebSocketMessage{
		MessageID:   cmd.GenerateMessageID(20),
		ClientID:    clientID,
		MessageType: types.MsgConnect,
	}

	select {
	case <-time.After(5 * time.Second):
		fmt.Print("Client connect timed out after 5 seconds", "\r\n")
		close(done)
		return
	case incoming := <-in:
		if incoming.MessageType != types.MsgConnectAck {
			fmt.Print("Received invalid connect response from server (wrong msgtype): ", incoming, "\r\n")
			close(done)
			return
		}
	}

	disconnect := make(chan struct{})
	for {
		should_echo.Set(true)
	loop_start:
		select {
		case <-disconnect:
			fmt.Print("closing client...\r\n")
			out <- types.WebSocketMessage{
				MessageID:   cmd.GenerateMessageID(20),
				ClientID:    clientID,
				MessageType: types.MsgDisconnect,
			}

			conn_closed := make(chan struct{})
			go func() {
				timeout := time.After(5 * time.Second)
				for {
					select {
					case <-timeout:
						fmt.Print("client closure timed out\r\n")
						close(conn_closed)
					case incoming := <-in:
						if incoming.MessageType == types.MsgDisconnectAck {
							fmt.Print("client closed\r\n")
							close(conn_closed)
						}
					}
				}
			}()

			for range conn_closed {
			}

			fmt.Print("closing websocket connection...\r\n")
			conn.Close()
			wg.Wait()
			return
		default:
		}
		// Get command from stdin
		fmt.Print("\x1b[36m> \x1b[0m")
		input := ""
		select {
		case input = <-lines_in:
		case shortcut := <-shortcuts_in:
			if shortcut == "ctrl+d" || shortcut == "ctrl+c" {
				fmt.Print("closing...\r\n")
				close(disconnect)
				goto loop_start
			}
		}
		if len(strings.TrimSpace(input)) == 0 {
			continue
		}
		// Send command
		env_map := map[string]string{}
		env.Range(func(k, v any) bool { env_map[k.(string)] = v.(string); return true })
		call_msg_id := cmd.GenerateMessageID(20)
		out <- types.WebSocketMessage{
			MessageID:   call_msg_id,
			ClientID:    clientID,
			MessageType: types.MsgRunCommand,

			Command: input,
			SetEnv:  env_map,
		}

		// Confirm that the command is running
		for incoming := range in {
			shouldbreak := false
			switch incoming.MessageType {
			case types.MsgCommandRunning:
				if incoming.RefID != call_msg_id {
					fmt.Printf("Wrong RefID (expect %q): %q\r\n", call_msg_id, incoming.RefID)
					close(done)
					return
				}
				shouldbreak = true
			case types.MsgSetEnv:
			case types.MsgErrResponse:
				fmt.Print("Client error: ", incoming.Error, "\r\n")
				close(done)
				return
			default:
				fmt.Print("Unexpected message type received after trying to run command:", incoming, "\r\n")
				close(done)
				return
			}
			if shouldbreak {
				break
			}
		}

		command_stop_channel := make(chan struct{})

		cmd_in_lines := make(chan string)
		// Stoppable line reading
		go func() {
			defer close(cmd_in_lines)
			for {
				select {
				case <-command_stop_channel:
					return
				case line := <-lines_in:
					cmd_in_lines <- line
				}
			}
		}()

		command_running := true
		for command_running {
			tmp_in_lines := cmd_in_lines

			select {
			case line := <-tmp_in_lines:
				out <- types.WebSocketMessage{
					MessageID:   cmd.GenerateMessageID(20),
					ClientID:    clientID,
					MessageType: types.MsgInputStream,

					InputStream: line + "\r\n",
				}
			case shortcut := <-shortcuts_in:
				switch shortcut {
				case "ctrl+d":
					out <- types.WebSocketMessage{
						MessageID:   cmd.GenerateMessageID(20),
						ClientID:    clientID,
						MessageType: types.MsgInputEOF,
					}
				case "ctrl+c":
					out <- types.WebSocketMessage{
						MessageID:   cmd.GenerateMessageID(20),
						ClientID:    clientID,
						MessageType: types.MsgCommandInterrupt,
					}
				}
			case incoming := <-in:
				switch incoming.MessageType {
				case types.MsgOutputStream:
					if _, err := os.Stdout.WriteString(incoming.OutputStream); err != nil {
						fmt.Print("Failed to write to stdout:", err, "\r\n")
						close(done)
						return
					}
				case types.MsgErrorStream:
					if _, err := os.Stderr.WriteString(incoming.ErrorStream); err != nil {
						fmt.Print("Failed to write to stderr:", err, "\r\n")
						close(done)
						return
					}
				case types.MsgSetEnv:
				case types.MsgCommandFinished:
					command_running = false
					close(command_stop_channel)
					for range cmd_in_lines {
					}
					fmt.Print("\r\n\x1b[0m\x1b[?25h")
				default:
					fmt.Print("Unexpected message received during command execution:", incoming, "\r\n")
					close(done)
					return
				}
			}
		}
	}
}
