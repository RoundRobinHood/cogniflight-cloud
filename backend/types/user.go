package types

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Role string

const (
	RolePilot    Role = "pilot"
	RoleATC      Role = "atc"
	RoleSysAdmin Role = "sysadmin"
)

type PilotCabintempPref struct {
	OptimalTemp    float64 `bson:"optimal_temperature" json:"optimal_temperature"`
	ToleranceRange float64 `bson:"tolerance_range" json:"tolerance_range"`
}

type PilotEnvPref struct {
	NoiseSensitivity string             `bson:"noise_sensitivity" json:"noise_sensitivity"`
	LightSensitivity string             `bson:"light_sensitivity" json:"light_sensitivity"`
	CabinTempPref    PilotCabintempPref `bson:"cabin_temperature_preferences" json:"cabin_temperature_preferences"`
}

type PilotInfo struct {
	FaceEmbeddings    [][]float64    `bson:"face_embeddings" json:"face_embeddings"`
	LicenseNr         string         `bson:"license_nr" json:"license_nr"`
	CertificateExpiry time.Time      `bson:"certification_expiry" json:"certification_expiry"`
	FlightHours       float64        `bson:"flight_hours" json:"flight_hours"`
	Baseline          map[string]any `bson:"baseline" json:"baseline"`
	EnvironmentPref   PilotEnvPref   `bson:"environment_preferences" json:"environment_preferences"`
}

type PilotInfoUpdate struct {
	LicenseNr         string                        `json:"license_nr" bson:"license_nr,omitempty"`
	FlightHours       OptionalField[float64]        `json:"flight_hours" bson:"flight_hours,omitempty"`
	CertificateExpiry OptionalField[time.Time]      `json:"certification_expiry" bson:"certification_expiry,omitempty"`
	Baseline          OptionalField[map[string]any] `json:"baseline" bson:"baseline,omitempty"`
	EnvironmentPref   struct {
		CabinTempPref struct {
			OptimalTemp    OptionalField[float64] `json:"optimal_temperature" bson:"optimal_temperature,omitempty"`
			ToleranceRange OptionalField[float64] `json:"tolerance_range" bson:"tolerance_range"`
		} `json:"cabin_temperature_preferences" bson:"cabin_temperature_preferences,omitempty"`
		NoiseSensitivity string `json:"noise_sensitivity" bson:"noise_sensitivity,omitempty"`
		LightSensitivity string `json:"light_sensitivity" bson:"light_sensitivity,omitempty"`
	} `json:"environment_preferences" bson:"environment_preferences,omitempty"`
}

type User struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Name         string              `bson:"name" json:"name"`
	Email        string              `bson:"email" json:"email"`
	Phone        string              `bson:"phone" json:"phone"`
	Pwd          string              `bson:"pwd" json:"pwd"`
	Role         Role                `bson:"role" json:"role"`
	ProfileImage *primitive.ObjectID `bson:"profile_image_id,omitempty" json:"profile_image_id,omitempty"`
	PilotInfo    *PilotInfo          `bson:"pilot_info,omitempty" json:"pilot_info,omitempty"`
	CreatedAt    time.Time           `bson:"created_at" json:"created_at"`
}

type UserUpdate struct {
	Name         string                             `json:"name" bson:"name,omitempty"`
	Email        string                             `json:"email" bson:"email,omitempty"`
	Phone        string                             `json:"phone" bson:"phone,omitempty"`
	Role         Role                               `json:"role" bson:"role,omitempty"`
	ProfileImage OptionalField[*primitive.ObjectID] `json:"profile_image" bson:"profile_image,omitempty"`
	PilotInfo    OptionalField[*PilotInfoUpdate]    `json:"pilot_info" bson:"pilot_info,omitempty"`
}

type UserInfo struct {
	ID        primitive.ObjectID `json:"id"`
	Name      string             `json:"name"`
	Email     string             `json:"email"`
	Phone     string             `json:"phone"`
	Role      Role               `json:"role"`
	PilotInfo *PilotInfo         `json:"pilot_info,omitempty"`
}

var ErrUserNotExist = errors.New("User does not exist")

type UserStore interface {
	GetUserByEmail(email string, ctx context.Context) (*User, error)
	GetUserByID(ID primitive.ObjectID, ctx context.Context) (*User, error)
	CreateUser(User User, ctx context.Context) (*User, error)
	UpdateUser(ID primitive.ObjectID, update UserUpdate, ctx context.Context) (*User, error)
}
