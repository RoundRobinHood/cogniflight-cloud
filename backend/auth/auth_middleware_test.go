package auth

import (
	"context"
	"fmt"
	"testing"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestUserAuthMiddleware(t *testing.T) {
	sessionStore := &testutil.FakeSessionStore{}
	sess, err := sessionStore.CreateSession(primitive.NewObjectID(), types.RolePilot, context.Background())
	if err != nil {
		t.Fatalf("SessionStore failed to create session: %v", err)
	}
	sess2, err := sessionStore.CreateSession(primitive.NewObjectID(), types.RoleATC, context.Background())
	if err != nil {
		t.Fatalf("SessionStore failed to create session: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := testutil.InitTestEngine()
	r.GET("/ping", UserAuthMiddleware(sessionStore, map[types.Role]struct{}{types.RolePilot: {}}), func(c *gin.Context) {
		c.String(200, "pong!")
	})

	t.Run("Request without credentials unauthorized", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", nil)

		if w.Result().StatusCode != 401 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 401)
		}
	})
	t.Run("Request with valid credentials let through", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if w.Result().StatusCode != 200 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 200)
		}
	})
	t.Run("Request with invalid credentials unauthorized", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Cookie": "sessid=heh"})

		if w.Result().StatusCode != 401 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 401)
		}
	})
	t.Run("Request with unauthorized role is 403", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Cookie": "sessid=" + sess2.SessID})

		if w.Result().StatusCode != 403 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 403)
		}
	})
}

func TestKeyAuthMiddleware(t *testing.T) {
	keyStore := testutil.FakeAPIKeyStore{}
	keyStr, _, err := keyStore.CreateKey(context.Background())
	if err != nil {
		t.Fatalf("keyStore returned err: %v", err)
	}
	r := testutil.InitTestEngine()
	r.GET("/ping", KeyAuthMiddleware(&keyStore), func(c *gin.Context) {
		c.JSON(200, gin.H{"msg": "Pong!"})
	})
	t.Run("Request without auth header 401", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", nil)

		if w.Result().StatusCode != 401 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 400)
		}
	})
	t.Run("Request with non-bearer key 401", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Authorization": "Basic abcbdefefef78723"})
		if code := w.Result().StatusCode; code != 401 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: 401", code)
		}
	})
	t.Run("Incorrect key 401", func(t *testing.T) {
		key, keyObj, err := util.GenerateKey(context.Background())
		if err != nil {
			t.Errorf("generateKey error: %v", err)
			return
		}
		keyStr := fmt.Sprintf("%s-%x", keyObj.ID.Hex(), key)
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Authorization": "Bearer " + keyStr})

		if code := w.Result().StatusCode; code != 401 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want 401", code)
		}
	})
	t.Run("Correct key 200", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/ping", map[string]string{"Authorization": "Bearer " + keyStr})

		if code := w.Result().StatusCode; code != 200 {
			fmt.Print(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want 200", code)
		}
	})
}
