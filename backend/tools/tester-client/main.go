package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/client"
)

func main() {
	username := os.Getenv("USERNAME")
	password := os.Getenv("PASSWORD")

	api_url := os.Args[1]
	ws_url := strings.Replace(api_url, "http", "ws", 1)

	sessID, err := client.Login(api_url+"/login", username, password)
	if err != nil {
		log.Fatal("Couldn't log in: ", err)
	}

	socket, err := client.ConnectSocket(ws_url+"/cmd-socket", sessID)
	if err != nil {
		log.Fatal("failed to initialize socket connection: ", err)
	}

	session := client.NewSocketSession(socket)

	term_client, err := session.ConnectClient("term-1")
	if err != nil {
		log.Fatal("failed to initialize term_client: ", err)
	}

	stdout := &bytes.Buffer{}
	stderr := &bytes.Buffer{}

	result, err := term_client.RunCommand(context.Background(), client.CommandOptions{
		Command: "whoami",
		Stdin:   strings.NewReader(""),
		Stdout:  stdout,
		Stderr:  stderr,
	})

	if err != nil {
		log.Fatal("failed to run whoami: ", err)
	}

	if err := term_client.Disconnect(context.Background()); err != nil {
		log.Fatal("failed to disconnect: ", err)
	}

	fmt.Println("Stdout:")
	fmt.Println(stdout.String())
	fmt.Println("Stderr:")
	fmt.Println(stderr.String())
	os.Exit(result)
}
