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
	"github.com/RoundRobinHood/cogniflight-cloud/backend/crud"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/db"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/edge"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/images"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/keys"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/pilot"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/settings"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/sourcegraph/jsonrpc2"
	"go.mongodb.org/mongo-driver/bson"
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

	userStore := db.DBUserStore{Col: database.Collection("users")}
	sessionStore := db.DBSessionStore{Col: database.Collection("sessions")}
	signupTokenStore := db.DBSignupTokenStore{Col: database.Collection("signup_tokens")}
	nodeStore := db.DBEdgeNodeStore{Col: database.Collection("edge_nodes")}
	keyStore := db.DBAPIKeyStore{Col: database.Collection("api_keys")}
	imageStore := db.DBUserImageStore{Col: database.Collection("user_images"), Bucket: bucket}

	go func() {
		for {
			if err := client.Ping(context.Background(), nil); err != nil {
				log.Printf("[MongoDB] Not reachable: %v", err)
				time.Sleep(2 * time.Second)
			} else {
				log.Println("[MongoDB] Connection established!")
				cur, err := userStore.Col.Find(context.Background(), bson.D{})

				if err != nil {
					fmt.Fprintf(os.Stderr, "Failed to query user table: %v\n", err)

				} else {
					if !cur.Next(context.Background()) {
						if err := cur.Err(); err != nil {
							fmt.Fprintf(os.Stderr, "Failed to iterate user table query: %v\n", err)
						} else {
							// Landing here means there are no users
							fmt.Fprintln(os.Stderr, "No users in the database. Checking for bootstrap credentials...")

							user := os.Getenv("BOOTSTRAP_USERNAME")
							email := os.Getenv("BOOTSTRAP_EMAIL")
							phone := os.Getenv("BOOTSTRAP_PHONE")
							pwd := os.Getenv("BOOTSTRAP_PWD")

							hashed_pwd, err := util.HashPwd(pwd)
							if err != nil {
								fmt.Fprintln(os.Stderr, "Failed to hash pwd: ", err)
								return
							}

							if user != "" && email != "" && phone != "" && pwd != "" {

								if _, err := userStore.CreateUser(types.User{
									Name:  user,
									Role:  types.RoleSysAdmin,
									Email: email,
									Phone: phone,
									Pwd:   hashed_pwd,
								}, context.Background()); err != nil {
									fmt.Fprintln(os.Stderr, "Failed to create user: ", err)
									return
								}
								fmt.Fprintln(os.Stderr, "Bootstrap user created successfully")

							}
						}
					}
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

	r.POST("/login", auth.Login(userStore, sessionStore))
	r.POST("/logout", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleSysAdmin: {},
		types.RoleATC:      {},
		types.RolePilot:    {},
	}), auth.Logout(sessionStore))
	r.POST("/signup-tokens", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{types.RoleSysAdmin: {}}), auth.CreateSignupToken(signupTokenStore))
	r.POST("/signup", auth.Signup(userStore, signupTokenStore, sessionStore))
	r.GET("/whoami", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleSysAdmin: {},
		types.RoleATC:      {},
		types.RolePilot:    {},
	}), auth.WhoAmI(sessionStore, userStore))
	r.PATCH("/settings", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleSysAdmin: {},
		types.RoleATC:      {},
		types.RolePilot:    {},
	}), settings.Settings(userStore))
	r.POST("/edge-nodes", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleSysAdmin: {},
	}), edge.CreateEdgeNode(nodeStore))
	r.GET("/pilots/:id", auth.KeyAuthMiddleware(keyStore), pilot.FetchPilotByID(userStore))
	r.POST("/my/images", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleSysAdmin: {},
		types.RoleATC:      {},
		types.RolePilot:    {},
	}), images.UploadImage(imageStore))
	r.POST("/check-api-key", keys.CheckKey(keyStore))
	r.POST("/hi", func(c *gin.Context) { c.String(200, "hello") })

	key_group := r.Group("/api-keys/", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleSysAdmin: {},
	}))

	key_repo := &keys.KeyRepository{Store: keyStore}

	key_group.GET("", crud.List(key_repo, 10))
	key_group.GET(":id", crud.Get(key_repo, "id"))
	key_group.POST("", crud.Create(key_repo))
	key_group.DELETE(":id", crud.Delete(key_repo, "id"))

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
