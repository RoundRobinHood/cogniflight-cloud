package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"testing"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/auth"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/testutil"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
)

func TestSettingsEndpoint(t *testing.T) {
	userStore := testutil.FakeUserStore{}
	sessionStore := testutil.FakeSessionStore{}

	hashed, err := util.HashPwd("123pizza")
	if err != nil {
		t.Fatalf("Hashpwd err: %v", err)
	}

	user, err := userStore.CreateUser(types.User{
		Name:  "Piet",
		Email: "example@gmail.com",
		Phone: "981239812",
		Pwd:   hashed,
		Role:  types.RolePilot,
		PilotInfo: &types.PilotInfo{
			LicenseNr:   "JJ98398343",
			FlightHours: 53,
			Baseline:    nil,
			EnvironmentPref: types.PilotEnvPref{
				NoiseSensitivity: "medium",
				LightSensitivity: "low",
				CabinTempPref: types.PilotCabintempPref{
					OptimalTemp:    26,
					ToleranceRange: 4,
				},
			},
		},
		CreatedAt: time.Now(),
	}, context.Background())
	if err != nil {
		t.Fatalf("userStore err: %v", err)
	}

	sess, err := sessionStore.CreateSession(user.ID, user.Role, context.Background())

	r := testutil.InitTestEngine()
	r.PATCH("/settings", auth.UserAuthMiddleware(&sessionStore, map[types.Role]struct{}{
		types.RoleATC:      {},
		types.RolePilot:    {},
		types.RoleSysAdmin: {},
	}), Settings(&userStore))

	t.Run("Invalid JSON", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "PATCH", "{", "/settings", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if w.Result().StatusCode != 400 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, want 400, have: %d", w.Result().StatusCode)
		}
	})

	t.Run("Role updates not allowed", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "PATCH", `{"role": "sysadmin"}`, "/settings", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if w.Result().StatusCode != 403 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, want 403, have: %d", w.Result().StatusCode)
		}
	})

	t.Run("Email & cabintemp update", func(t *testing.T) {
		w := testutil.FakeRequest(t, r, "PATCH",
			`{
			"email": "nono@yahoo.com",
			"pilotInfo": {
				"environmentPreferences": {
					"cabinTemperaturePreferences": {
						"toleranceRange": 10
					}
				}
			}
		}`, "/settings", map[string]string{"Cookie": "sessid=" + sess.SessID})

		if w.Result().StatusCode != 200 {
			fmt.Println(jlogging.TestLogStr)
			t.Errorf("Wrong StatusCode, want 200 have: %d", w.Result().StatusCode)
		}

		bytes, err := io.ReadAll(w.Result().Body)
		if err != nil {
			t.Errorf("Body read error: %v", err)
		} else {
			var newUser types.User
			if err := json.Unmarshal(bytes, &newUser); err != nil {
				t.Errorf("Response JSON invalid. Err: %v\nResponse: %s", err, string(bytes))
				return
			}

			if newUser.Email != "nono@yahoo.com" {
				t.Errorf("Wrong Email, want %q got %q", "nono@yahoo.com", newUser.Email)
			}
			if newUser.PilotInfo.EnvironmentPref.CabinTempPref.ToleranceRange != 10 {
				t.Errorf("Wrong tolerancerange, want %.2f got %.2f", 10.0, newUser.PilotInfo.EnvironmentPref.CabinTempPref.ToleranceRange)
			}
		}
	})
}
