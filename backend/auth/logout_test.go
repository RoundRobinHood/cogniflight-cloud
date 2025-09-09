package auth

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestLogout(t *testing.T) {
	sessionStore := &testutil.FakeSessionStore{}
	sess, err := sessionStore.CreateSession(primitive.NewObjectID(), types.RolePilot, context.Background())
	if err != nil {
		t.Fatalf("SessionStore failed to create session: %v", err)
	}
	r := testutil.InitTestEngine()
	r.POST("/logout", UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RoleATC:      {},
		types.RolePilot:    {},
		types.RoleSysAdmin: {},
	}), Logout(sessionStore))

	w := testutil.FakeRequest(t, r, "POST", "", "/logout", map[string]string{"Cookie": "sessid=" + sess.SessID})

	if w.Result().StatusCode != 200 {
		fmt.Print(jlogging.TestLogStr)
		t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 200)
	}

	found := false
	for _, cookie := range w.Result().Cookies() {
		if cookie.Name == "sessid" {
			if cookie.Expires.UnixMilli() >= time.Now().UnixMilli() {
				t.Errorf("Delete cookie expires after now: %v", cookie.Expires)
				return
			} else {
				found = true
				break
			}
		}
	}

	if !found {
		t.Errorf("No Set-Cookie found")
	} else {
		if len(sessionStore.Sessions) != 0 {
			t.Errorf("Expected session to be deleted")
		}
	}
}
