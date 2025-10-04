package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/auth"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/cmd"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/sourcegraph/jsonrpc2"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	uri := os.Getenv("MONGO_URI")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalf("MongoDB init failed: %v", err)
	}

	database := client.Database("cogniflight")
	bucket, err := gridfs.NewBucket(database)
	if err != nil {
		log.Fatalf("Couldn't create gridFS bucket: %v", err)
	}

	fileStore := filesystem.Store{Col: database.Collection("vfs"), Bucket: bucket}

	go func() {
		for {
			if err := client.Ping(context.Background(), nil); err != nil {
				log.Printf("[MongoDB] Not reachable: %v", err)
				time.Sleep(2 * time.Second)
			} else {
				log.Println("[MongoDB] Connection established!")

				if _, err := fileStore.Lookup(context.Background(), nil, "/"); err != nil {
					if err != os.ErrNotExist {
						log.Fatal("Couldn't check for filesystem (exiting): ", err)
					}

					// No filesystem
					log.Println("No filesystem found. Looking for bootstrap credentials for init...")

					username := os.Getenv("BOOTSTRAP_USERNAME")
					email := os.Getenv("BOOTSTRAP_EMAIL")
					phone := os.Getenv("BOOTSTRAP_PHONE")
					pwd := os.Getenv("BOOTSTRAP_PWD")

					if username == "" || email == "" || phone == "" || pwd == "" {
						log.Fatal("No bootstrap credentials found. Nothing to provide users. exiting")
					}

					if err := InitFilesystem(fileStore, username, email, phone, pwd); err != nil {
						log.Fatal("Failed to init file system: ", err)
					}

					fmt.Println("Successfully initialized file system")
				}
				break
			}

		}

	}()

	mlSockFile := "../ml-engine/test.sock"
	if path := os.Getenv("ML_SOCK_FILE"); path != "" {
		mlSockFile = path
	}
	var conn net.Conn
	for {
		if conn, err = net.Dial("unix", mlSockFile); err != nil {
			fmt.Printf("Failed to connect to ml-engine (%v). Waiting...\n", err)
			time.Sleep(2 * time.Second)
		} else {
			fmt.Printf("Successfully connected to ml-engine at %s\n", mlSockFile)
			break
		}
	}

	stream := jsonrpc2.NewPlainObjectStream(conn)
	_ = jsonrpc2.NewConn(context.Background(), stream, nil)

	r := gin.New()
	r.SetTrustedProxies(strings.Split(os.Getenv("TRUSTED_PROXIES"), ","))
	r.Use(jlogging.Middleware())

	r.POST("/check-mqtt-user", auth.CheckMQTTUser(fileStore))
	r.POST("/hi", func(c *gin.Context) { c.String(200, "hello") })

	r.GET("/signup/check-username/:username", auth.SignupCheckUsername(fileStore))
	r.POST("/signup", auth.Signup(fileStore))
	r.POST("/login", auth.Login(fileStore))
	r.GET("/cmd-socket", auth.AuthMiddleware(fileStore), cmd.CmdWebhook(fileStore))

	server := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %s", err)
		}
	}()

	if gin.Mode() == gin.DebugMode {
		fmt.Println("Server running on http://localhost:8080")
	}

	<-quit
	if gin.Mode() == gin.DebugMode {
		fmt.Println("Shutting down server...")
	}

	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shut down: %s\n", err)
	}

	if gin.Mode() == gin.DebugMode {
		fmt.Println("Server gracefully stopped.")
	}
}
