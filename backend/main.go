package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/jeremiafourie/cogniflight-cloud/backend/auth"
	"github.com/jeremiafourie/cogniflight-cloud/backend/db"
	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
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

	userStore := db.DBUserStore{Col: database.Collection("users")}
	sessionStore := db.DBSessionStore{Col: database.Collection("sessions")}
	signupTokenStore := db.DBSignupTokenStore{Col: database.Collection("signup_tokens")}

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

							hashed_pwd, err := auth.HashPwd(pwd)
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

	r := gin.New()
	r.SetTrustedProxies(strings.Split(os.Getenv("TRUSTED_PROXIES"), ","))
	r.Use(jlogging.Middleware())

	r.POST("/login", auth.Login(userStore, sessionStore))
	r.POST("/signup-token", auth.AuthMiddleware(sessionStore, map[types.Role]struct{}{types.RoleSysAdmin: {}}), auth.CreateSignupToken(signupTokenStore))
	r.POST("/signup", auth.Signup(userStore, signupTokenStore, sessionStore))
	r.GET("/whoami", auth.AuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleSysAdmin: {},
		types.RoleATC:      {},
		types.RolePilot:    {},
	}), auth.WhoAmI(sessionStore, userStore))

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
