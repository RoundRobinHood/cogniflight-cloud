package pilot

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"testing"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestFetchByID(t *testing.T) {
	hashed_pw, err := util.HashPwd("123pizza")
	if err != nil {
		t.Fatalf("HashPwd error: %v", err)
	}
	userStore := &testutil.FakeUserStore{}
	pilot, err := userStore.CreateUser(types.User{
		ID:    primitive.NewObjectID(),
		Name:  "Pietie",
		Email: "example@gmail.com",
		Phone: "239829381",
		Pwd:   hashed_pw,
		Role:  types.RolePilot,
		PilotInfo: &types.PilotInfo{
			LicenseNr:   "ijeijfef",
			FlightHours: 29,
			EnvironmentPref: types.PilotEnvPref{
				NoiseSensitivity: "high",
				LightSensitivity: "medium",
				CabinTempPref: types.PilotCabintempPref{
					OptimalTemp:    24,
					ToleranceRange: 5,
				},
			},
		},
		CreatedAt: time.Now(),
	}, context.Background())
	if err != nil {
		t.Fatalf("userStore error: %v", err)
	}
	admin, err := userStore.CreateUser(types.User{
		ID:        primitive.NewObjectID(),
		Name:      "Sandy",
		Email:     "whowhatwhere@when.com",
		Phone:     "28328318",
		Pwd:       hashed_pw,
		Role:      types.RoleSysAdmin,
		CreatedAt: time.Now(),
	}, context.Background())

	r := testutil.InitTestEngine()
	r.GET("/pilots/:id", FetchPilotByID(userStore))

	t.Run("Invalid ID", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/pilots/abc", nil)

		if code := w.Result().StatusCode; code != 400 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode. Want: 400, got: %d", code)
		}
	})

	t.Run("Non-existent ID", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/pilots/"+primitive.NewObjectID().Hex(), nil)

		if code := w.Result().StatusCode; code != 404 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode. Want: 404, got: %d", code)
		}
	})

	t.Run("Non-pilot ID", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/pilots/"+admin.ID.Hex(), nil)

		if code := w.Result().StatusCode; code != 409 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode. Want: 409, got: %d", code)
		}
	})

	t.Run("Valid ID", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "GET", "", "/pilots/"+pilot.ID.Hex(), nil)

		var resp types.UserInfo
		if code := w.Result().StatusCode; code != 200 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode. Want: 200, got: %d", code)
		} else if bytes, err := io.ReadAll(w.Result().Body); err != nil {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Failed to read response: %v", err)
		} else if err := json.Unmarshal(bytes, &resp); err != nil {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Received invalid JSON: %v", err)
		} else {
			if resp.ID != pilot.ID {
				t.Errorf("Wrong response ID, want: %q, got: %q", pilot.ID.Hex(), resp.ID.Hex())
			}
		}
	})
}
