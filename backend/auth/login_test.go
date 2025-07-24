package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/jeremiafourie/cogniflight-cloud/backend/testutil"
	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestLogin(t *testing.T) {
	hash_pwd, err := HashPwd("123pizza")
	if err != nil {
		t.Fatalf("HashPwd error: %v", err)
	}
	exampleUser := types.User{
		ID:        primitive.NewObjectID(),
		Name:      "John Doe",
		Email:     "example@gmail.com",
		Pwd:       hash_pwd,
		Role:      types.RolePilot,
		CreatedAt: time.Now(),
	}
	userStore := testutil.FakeUserStore{
		Users: map[string]types.User{
			"example@gmail.com": exampleUser,
		},
	}
	sessionStore := &testutil.FakeSessionStore{}

	r := testutil.InitTestEngine()
	r.POST("/login", Login(&userStore, sessionStore))

	t.Run("Correct credentials", func(t *testing.T) {
		body := `{"email": "example@gmail.com", "pwd": "123pizza"}`
		w := testutil.FakeRequest(t, r, "POST", body, "/login", nil)

		if w.Result().StatusCode != 200 {
			t.Errorf("Wrong StatusCode: want %d, got %d", 200, w.Result().StatusCode)
		}
		if !sessionStore.CreateCalled {
			t.Errorf("Expected sessionStore to be called")
		} else {
			if sessionStore.UserID != exampleUser.ID {
				t.Errorf("Wrong userID provided to sessStore: have %v want %v", sessionStore.UserID, exampleUser.ID)
			}
			if sessionStore.Role != exampleUser.Role {
				t.Errorf("Wrong role provided to sessStore: have %q want %q", sessionStore.Role, exampleUser.Role)
			}
			cookie := w.Result().Header.Get("Set-Cookie")
			if !strings.Contains(cookie, "sessid="+sessionStore.SessID) {
				t.Errorf("Expected Set-Cookie to contain sessid (set-cookie: %q)", cookie)
			}
		}
	})

	sessionStore.CreateCalled = false
	t.Run("Incorrect password", func(t *testing.T) {
		body := `{"email": "example@gmail.com", "pwd": "password"}`
		w := testutil.FakeRequest(t, r, "POST", body, "/login", nil)

		if w.Result().StatusCode != 401 {
			t.Errorf("Wrong StatusCode: want %d, got %d", 401, w.Result().StatusCode)
		}
		if sessionStore.CreateCalled {
			t.Errorf("Expected sessionStore not to be called")
		}
	})

	sessionStore.CreateCalled = false
	t.Run("Malformed request body", func(t *testing.T) {
		body := `{"email": "example@gmail.com", "pwd": "123pizza"`
		w := testutil.FakeRequest(t, r, "POST", body, "/login", nil)

		if w.Result().StatusCode != 400 {
			t.Errorf("Wrong StatusCode: want %d, got %d", 400, w.Result().StatusCode)
		}
		if sessionStore.CreateCalled {
			t.Errorf("Expected sessionStore not to be called")
		}
	})
}
