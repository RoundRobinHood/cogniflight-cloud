package keys

import (
	"context"
	"fmt"
	"testing"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestCreateKey(t *testing.T) {
	nodeStore := &testutil.FakeEdgeNodeStore{}
	keyStore := &testutil.FakeAPIKeyStore{}

	node, err := nodeStore.CreateEdgeNode(types.PlaneInfo{}, context.Background())
	if err != nil {
		t.Fatalf("nodeStore err: %v", err)
	}

	r := testutil.InitTestEngine()
	r.POST("/api-keys", CreateAPIKey(keyStore, nodeStore))

	t.Run("Invalid JSON", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "POST", "{", "/api-keys", nil)

		if code := w.Result().StatusCode; code != 400 {
			t.Errorf("Wrong StatusCode. Want 400, got %d", code)
		}
	})

	t.Run("Required fields missing", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "POST", "{}", "/api-keys", nil)

		if code := w.Result().StatusCode; code != 400 {
			t.Errorf("Wrong StatusCode. Want 400, got %d", code)
		}
	})

	t.Run("Wrong edgeNode", func(t *testing.T) {
		body := fmt.Sprintf(`{"edgeNode": "%s"}`, primitive.NewObjectID().Hex())
		w := testutil.FakeRequest(t, r, "POST", body, "/api-keys", nil)

		if code := w.Result().StatusCode; code != 409 {
			t.Errorf("Wrong StatusCode. Want 409, got %d", code)
		}
	})

	t.Run("Valid EdgeNode API key", func(t *testing.T) {
		body := fmt.Sprintf(`{"edgeNode": "%s"}`, node.ID.Hex())
		w := testutil.FakeRequest(t, r, "POST", body, "/api-keys", nil)

		if code := w.Result().StatusCode; code != 201 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode. Want 201, got %d", code)
		} else if len(keyStore.Keys) == 0 {
			fmt.Println(jlogging.TestLogStr)
			t.Error("Expected key to be created")
		}
	})
}
