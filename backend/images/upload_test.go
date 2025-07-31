package images

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"
	"testing"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/auth"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestUploadImage(t *testing.T) {
	hash_pwd, err := util.HashPwd("123pizza")
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
	userStore := &testutil.FakeUserStore{}
	if _, err := userStore.CreateUser(exampleUser, context.Background()); err != nil {
		t.Fatalf("userStore err: %v", err)
	}

	sessionStore := &testutil.FakeSessionStore{}
	sess, err := sessionStore.CreateSession(exampleUser.ID, exampleUser.Role, context.Background())
	if err != nil {
		t.Fatalf("SessionStore error: %v", err)
	}
	imageStore := &testutil.FakeUserImageStore{}

	r := testutil.InitTestEngine()
	r.POST("/images", auth.UserAuthMiddleware(sessionStore, map[types.Role]struct{}{
		types.RolePilot: {}}), UploadImage(imageStore))

	t.Run("No image upload", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "POST", "", "/images", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if code := w.Result().StatusCode; code != 400 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: 400", code)
		}
	})

	t.Run("Valid image upload", func(t *testing.T) {
		imageData := []byte{0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46}

		var b bytes.Buffer
		writer := multipart.NewWriter(&b)

		part, err := writer.CreateFormFile("image", "example.png")
		if err != nil {
			t.Fatalf("CreateFormFile err: %v", err)
		}
		if _, err := part.Write(imageData); err != nil {
			t.Fatalf("Failed to write imageData: %v", err)
		}

		if err := writer.Close(); err != nil {
			t.Fatalf("Close multipart writer err: %v", err)
		}

		w := testutil.FakeRequest(t, r, "POST", b.String(), "/images", map[string]string{
			"Cookie":       "sessid=" + sess.SessID,
			"Content-Type": writer.FormDataContentType(),
		})

		if code := w.Result().StatusCode; code != 201 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, have: %d, want: 201", code)
		}
	})
}
