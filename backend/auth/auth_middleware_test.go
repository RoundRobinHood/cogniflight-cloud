package auth

import (
	"context"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestAuthMiddleware(t *testing.T) {
	sessionStore := &FakeSessionStore{}
	sess, err := sessionStore.CreateSession(primitive.NewObjectID(), types.RolePilot, context.Background())
	if err != nil {
		t.Fatalf("SessionStore failed to create session: %v", err)
	}
	sess2, err := sessionStore.CreateSession(primitive.NewObjectID(), types.RoleATC, context.Background())
	if err != nil {
		t.Fatalf("SessionStore failed to create session: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/ping", AuthMiddleware(sessionStore, map[types.Role]struct{}{types.RolePilot: {}}), func(c *gin.Context) {
		c.String(200, "pong!")
	})

	t.Run("Request without credentials unauthorized", func(t *testing.T) {
		w := FakeRequest(t, r, "GET", "", "/ping", nil)

		if w.Result().StatusCode != 401 {
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 401)
		}
	})
	t.Run("Request with valid credentials let through", func(t *testing.T) {
		w := FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if w.Result().StatusCode != 200 {
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 200)
		}
	})
	t.Run("Request with invalid credentials unauthorized", func(t *testing.T) {
		w := FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Cookie": "sessid=heh"})

		if w.Result().StatusCode != 401 {
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 401)
		}
	})
	t.Run("Request with unauthorized role is 403", func(t *testing.T) {
		w := FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Cookie": "sessid=" + sess2.SessID})

		if w.Result().StatusCode != 403 {
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 403)
		}
	})
}
