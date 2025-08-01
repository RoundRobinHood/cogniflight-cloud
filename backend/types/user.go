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
	OptimalTemp    float64 `bson:"optimalTemperature" json:"optimalTemperature"`
	ToleranceRange float64 `bson:"toleranceRange" json:"toleranceRange"`
}

type PilotEnvPref struct {
	NoiseSensitivity string             `bson:"noiseSensitivity" json:"noiseSensitivity"`
	LightSensitivity string             `bson:"lightSensitivity" json:"lightSensitivity"`
	CabinTempPref    PilotCabintempPref `bson:"cabinTemperaturePreferences" json:"cabinTemperaturePreferences"`
}

type PilotInfo struct {
	FaceEmbeddings  [][]float64    `bson:"faceEmbeddings" json:"faceEmbeddings"`
	LicenseNr       string         `bson:"licenseNr" json:"licenseNr"`
	FlightHours     float64        `bson:"flightHours" json:"flightHours"`
	Baseline        map[string]any `bson:"baseline" json:"baseline"`
	EnvironmentPref PilotEnvPref   `bson:"environmentPreferences" json:"environmentPreferences"`
}

type PilotInfoUpdate struct {
	LicenseNr       string                        `json:"licenseNr" bson:"licenseNr,omitempty"`
	FlightHours     OptionalField[float64]        `json:"flightHours" bson:"flightHours,omitempty"`
	Baseline        OptionalField[map[string]any] `json:"baseline" bson:"baseline,omitempty"`
	EnvironmentPref struct {
		CabinTempPref struct {
			OptimalTemp    OptionalField[float64] `json:"optimalTemperature" bson:"optimalTemperature,omitempty"`
			ToleranceRange OptionalField[float64] `json:"toleranceRange" bson:"toleranceRange"`
		} `json:"cabinTemperaturePreferences" bson:"cabinTemperaturePreferences,omitempty"`
		NoiseSensitivity string `json:"noiseSensitivity" bson:"noiseSensitivity,omitempty"`
		LightSensitivity string `json:"lightSensitivity" bson:"lightSensitivity,omitempty"`
	} `json:"environmentPreferences" bson:"environmentPreferences,omitempty"`
}

type User struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Name         string              `bson:"name" json:"name"`
	Email        string              `bson:"email" json:"email"`
	Phone        string              `bson:"phone" json:"phone"`
	Pwd          string              `bson:"pwd" json:"pwd"`
	Role         Role                `bson:"role" json:"role"`
	ProfileImage *primitive.ObjectID `bson:"profileImage,omitempty" json:"profileImage,omitempty"`
	PilotInfo    *PilotInfo          `bson:"pilotInfo,omitempty" json:"pilotInfo,omitempty"`
	CreatedAt    time.Time           `bson:"createdAt" json:"createdAt"`
}

type UserUpdate struct {
	Name         string                             `json:"name" bson:"name,omitempty"`
	Email        string                             `json:"email" bson:"email,omitempty"`
	Phone        string                             `json:"phone" bson:"phone,omitempty"`
	Role         Role                               `json:"role" bson:"role,omitempty"`
	ProfileImage OptionalField[*primitive.ObjectID] `json:"profileImage" bson:"profileImage,omitempty"`
	PilotInfo    OptionalField[*PilotInfoUpdate]    `json:"pilotInfo" bson:"pilotInfo,omitempty"`
}

type UserInfo struct {
	ID        primitive.ObjectID `json:"id"`
	Name      string             `json:"name"`
	Email     string             `json:"email"`
	Phone     string             `json:"phone"`
	Role      Role               `json:"role"`
	PilotInfo *PilotInfo         `json:"pilotInfo,omitempty"`
}

var ErrUserNotExist = errors.New("User does not exist")

type UserStore interface {
	GetUserByEmail(email string, ctx context.Context) (*User, error)
	GetUserByID(ID primitive.ObjectID, ctx context.Context) (*User, error)
	CreateUser(User User, ctx context.Context) (*User, error)
	UpdateUser(ID primitive.ObjectID, update UserUpdate, ctx context.Context) (*User, error)
}
