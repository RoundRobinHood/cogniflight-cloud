package keys

import (
	"context"
	"fmt"
	"testing"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
)

func TestKeyCheck(t *testing.T) {
	nodeStore := &testutil.FakeEdgeNodeStore{}
	keyStore := &testutil.FakeAPIKeyStore{}

	node, err := nodeStore.CreateEdgeNode(types.PlaneInfo{}, context.Background())
	if err != nil {
		t.Fatalf("nodeStore err: %v", err)
	}

	keyStr, _, err := keyStore.CreateKey(&node.ID, context.Background())

	r := testutil.InitTestEngine()
	r.POST("/check-key", CheckKey(keyStore))

	t.Run("Missing body", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "POST", "", "/check-key", nil)

		if code := w.Result().StatusCode; code != 400 {
			t.Errorf("Wrong StatusCode. Have %d, want %d", code, 401)
			fmt.Print(jlogging.TestLogStr)
		}
	})

	t.Run("Valid body", func(t *testing.T) {
		body := fmt.Sprintf(`{"clientid": "what", "username": "%s", "password": "%s"}`, keyStr, keyStr)
		w := testutil.FakeRequest(t, r, "POST", body, "/check-key", nil)

		if code := w.Result().StatusCode; code != 200 {
			t.Errorf("Wrong StatusCode. Have %d, want %d", code, 200)
			fmt.Print(jlogging.TestLogStr)
		}
	})

	t.Run("Wrong credentials", func(t *testing.T) {
		key, keyObj, err := util.GenerateKey(context.Background())
		if err != nil {
			t.Fatalf("Generate key err: %v", err)
		}
		wrongKeyStr := fmt.Sprintf("%s-%x", keyObj.ID.Hex(), key)
		wrongBody := fmt.Sprintf(`{"clientid": "what", "username": "%s", "password": "%s"}`, wrongKeyStr, wrongKeyStr)
		w := testutil.FakeRequest(t, r, "POST", wrongBody, "/check-key", map[string]string{"Content-Type": "application/x-www-form-urlencoded"})

		if code := w.Result().StatusCode; code != 401 {
			t.Errorf("Wrong StatusCode. Have %d, want %d", code, 401)
			fmt.Print(jlogging.TestLogStr)
		}
	})
}
