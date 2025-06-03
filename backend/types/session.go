package types

import (
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Session struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	SessID    string             `bson:"sess_id"`
	UserID    primitive.ObjectID `bson:"userID"`
	Role      Role               `bson:"role"`
	CreatedAt time.Time          `bson:"createdAt"`
}

var ErrSessionNotExist = errors.New("Session does not exist")

type SessionStore interface {
	CreateSession(UserID primitive.ObjectID, Role Role) (*Session, error)
	GetSession(SessID string) (*Session, error)
}
