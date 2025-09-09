package edge

import (
	"encoding/json"
	"fmt"
	"io"
	"testing"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
)

func TestCreateEdgeNode(t *testing.T) {
	nodeStore := &testutil.FakeEdgeNodeStore{}

	r := testutil.InitTestEngine()
	r.POST("/edge-nodes", CreateEdgeNode(nodeStore))

	t.Run("Invalid JSON", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "POST", "{", "/edge-nodes", nil)

		if code := w.Result().StatusCode; code != 400 {
			t.Errorf("Wrong StatusCode, want 400 got %d", code)
		}
	})

	t.Run("Fields missing", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "POST", "{}", "/edge-nodes", nil)

		if code := w.Result().StatusCode; code != 400 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, want 400 got %d", code)
		}

		w = testutil.FakeRequest(t, r, "POST", `{"plane_info": {}}`, "/edge-nodes", nil)

		if code := w.Result().StatusCode; code != 400 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, want 400 got %d", code)
		}
	})

	t.Run("Valid request", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "POST", `{"plane_info": {"tail_number": "N12345", "manufacturer": "Cessna", "model": "172", "year": 2020}}`, "/edge-nodes", nil)

		if code := w.Result().StatusCode; code != 201 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, want 201 got %d", code)
		}

		if nodeStore.Created == nil {
			t.Error("Expected node to be created, none was")
		}

		bytes, err := io.ReadAll(w.Result().Body)
		if err != nil {
			t.Errorf("Error reading body: %v", err)
		} else {
			var resp types.EdgeNode
			if err := json.Unmarshal(bytes, &resp); err != nil {
				t.Errorf("Invalid JSON response: %v\nBody: %s", err, string(bytes))
			} else {
				if resp.PlaneInfo.TailNr != "N12345" {
					t.Errorf("Expected TailNr to be %q, got %q", "N12345", resp.PlaneInfo.TailNr)
				}
			}
		}
	})
}
