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

type PilotInfo struct {
	FaceEmbeddings  [][]float64    `bson:"faceEmbeddings" json:"faceEmbeddings"`
	LicenseNr       string         `bson:"licenseNr" json:"licenseNr"`
	FlightHours     float64        `bson:"flightHours" json:"flightHours"`
	Baseline        map[string]any `bson:"baseline" json:"baseline"`
	EnvironmentPref struct {
		CabinTempPref struct {
			OptimalTemp    float64 `bson:"optimalTemperature" json:"optimalTemperature"`
			ToleranceRange float64 `bson:"toleranceRange" json:"toleranceRange"`
		} `bson:"cabinTemperaturePreferences" json:"cabinTemperaturePreferences"`
		NoiseSensitivity string `bson:"noiseSensitivity" json:"noiseSensitivity"`
		LightSensitivity string `bson:"lightSensitivity" json:"lightSensitivity"`
	} `bson:"environmentPreferences" json:"environmentPreferences"`
}

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name" json:"name"`
	Email        string             `bson:"email" json:"email"`
	Phone        string             `bson:"phone" json:"phone"`
	Pwd          string             `bson:"pwd" json:"pwd"`
	Role         Role               `bson:"role" json:"role"`
	ProfileImage primitive.ObjectID `bson:"profileImage,omitempty" json:"profileImage,omitempty"`
	PilotInfo    *PilotInfo         `bson:"pilotInfo,omitempty" json:"pilotInfo,omitempty"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
}

type UserInfo struct {
	ID    primitive.ObjectID `json:"id"`
	Name  string             `json:"name"`
	Email string             `json:"email"`
	Phone string             `json:"phone"`
	Role  Role               `json:"role"`
}

var ErrUserNotExist = errors.New("User does not exist")

type UserStore interface {
	GetUserByEmail(email string, ctx context.Context) (*User, error)
	GetUserByID(ID primitive.ObjectID, ctx context.Context) (*User, error)
	CreateUser(User User, ctx context.Context) (*User, error)
}
