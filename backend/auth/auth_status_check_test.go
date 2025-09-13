package auth

import (
	"context"
	"testing"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestStatusCheck(t *testing.T) {
	sessionStore := &testutil.FakeSessionStore{}
	sess, err := sessionStore.CreateSession(primitive.NewObjectID(), types.RolePilot, context.Background())
	if err != nil {
		t.Fatalf("SessionStore failed to create session: %v", err)
	}

	keyStore := &testutil.FakeAPIKeyStore{}
	id := primitive.NewObjectID()
	keyStr, key, err := keyStore.CreateKey(&id, context.Background())
	if err != nil {
		t.Fatalf("APIKeyStore failed to create key: %v", err)
	}

	var status types.AuthorizationStatus

	checkStatus := func(c *gin.Context) {
		status = CheckAuthStatus(c)

		c.String(200, "Hi")
	}

	r := testutil.InitTestEngine()
	r.GET("/user", UserAuthMiddleware(sessionStore, map[types.Role]struct{}{types.RolePilot: {}}), checkStatus)
	r.GET("/key", KeyAuthMiddleware(keyStore), checkStatus)

	t.Run("No auth", func(t *testing.T) {
		testutil.FakeRequest(t, r, "GET", "", "/user", nil)
		if status.Sess != nil || status.Key != nil {
			t.Errorf("Expected zero AuthStatus, got: %v", status)
		}

		status = types.AuthorizationStatus{}
		testutil.FakeRequest(t, r, "GET", "", "/key", nil)
		if status.Sess != nil || status.Key != nil {
			t.Errorf("Expected zero AuthStatus, got: %v", status)
		}
	})
	status = types.AuthorizationStatus{}

	t.Run("User auth", func(t *testing.T) {
		testutil.FakeRequest(t, r, "GET", "", "/user", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if status.Sess == nil {
			t.Errorf("Expected non-nil session status")
		} else if *status.Sess != *sess {
			t.Errorf("Wrong Sess, have: %v, want: %v", *status.Sess, *sess)
		}

		if status.Key != nil {
			t.Errorf("Expected key status = nil, got: %v", *status.Key)
		}
	})

	t.Run("Key auth", func(t *testing.T) {
		testutil.FakeRequest(t, r, "GET", "", "/key", map[string]string{"Authorization": "Bearer " + keyStr})

		if status.Key == nil {
			t.Errorf("Expected non-nil key status")
		} else if status.Key.ID != key.ID || status.Key.HashIterations != key.HashIterations ||
			!status.Key.Salt.Equal(key.Salt) || !status.Key.Key.Equal(key.Key) || status.Key.EdgeID != key.EdgeID {
			t.Errorf("Wrong Key, have: %v, want: %v", *status.Key, *key)
		}
	})
}
