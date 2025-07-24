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
	FaceEmbeddings [][]float64    `bson:"faceEmbeddings"`
	Baseline       map[string]any `bson:"baseline"`
}

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	Name         string             `bson:"name"`
	Email        string             `bson:"email"`
	Phone        string             `bson:"phone"`
	Pwd          string             `bson:"pwd"`
	Role         Role               `bson:"role"`
	ProfileImage primitive.ObjectID `bson:"profileImage,omitempty"`
	PilotInfo    *PilotInfo         `bson:"pilotInfo,omitempty"`
	CreatedAt    time.Time          `bson:"createdAt"`
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
