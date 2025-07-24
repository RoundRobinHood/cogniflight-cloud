package auth

import (
	"context"
	"encoding/json"
	"io"
	"testing"
	"time"

	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestWhoami(t *testing.T) {

	userStore := &FakeUserStore{}
	if hashed, err := HashPwd("123pizza"); err != nil {
		t.Fatalf("Failed to hash pwd: %s", err)
	} else {
		userStore.CreateUser(types.User{
			ID:        primitive.NewObjectID(),
			Name:      "Bro",
			Email:     "bro@gmail.com",
			Pwd:       hashed,
			Role:      types.RolePilot,
			CreatedAt: time.Now(),
		}, context.Background())
	}

	sessionStore := &FakeSessionStore{}
	sess, err := sessionStore.CreateSession(userStore.Created.ID, types.RolePilot, context.Background())
	if err != nil {
		t.Fatalf("SessionStore failed to create session: %v", err)
	}

	r := InitTestEngine()
	r.GET("/whoami", AuthMiddleware(sessionStore, map[types.Role]struct{}{types.RolePilot: {}}), WhoAmI(sessionStore, userStore))

	t.Run("Valid credentials", func(t *testing.T) {
		w := FakeRequest(t, r, "GET", "", "/whoami", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if w.Result().StatusCode != 200 {
			t.Errorf("Wrong StatusCode, have: %d, want: %d", w.Result().StatusCode, 200)
		}

		bytes, err := io.ReadAll(w.Body)
		if err != nil {
			t.Fatalf("Error occurred receiving body from test recorder: %v", err)
		}

		var ret types.UserInfo

		if err := json.Unmarshal(bytes, &ret); err != nil {
			t.Errorf("Invalid response body. Could not unmarshal: %s", err)
		} else {
			if ret.ID != sess.UserID {
				t.Errorf("Wrong UserID, have: %s, want: %s", ret.ID, sess.UserID)
			}
			if ret.Name != userStore.Created.Name {
				t.Errorf("Wrong Name, have: %q, want: %q", ret.Name, userStore.Created.Name)
			}
			if ret.Phone != userStore.Created.Phone {
				t.Errorf("Wrong PhoneNum, have: %q, want: %q", ret.Phone, userStore.Created.Phone)
			}
			if ret.Email != userStore.Created.Email {
				t.Errorf("Wrong Email, have: %q, want: %q", ret.Email, userStore.Created.Email)
			}
			if ret.Role != userStore.Created.Role {
				t.Errorf("Wrong Role, have: %q, want: %q", ret.Role, userStore.Created.Role)
			}
		}
	})
}
