package types

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Session struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	SessID    string             `bson:"sess_id" json:"sess_id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Role      Role               `bson:"role" json:"role"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
}

var ErrSessionNotExist = errors.New("Session does not exist")

type SessionStore interface {
	CreateSession(UserID primitive.ObjectID, Role Role, ctx context.Context) (*Session, error)
	GetSession(SessID string, ctx context.Context) (*Session, error)
}
