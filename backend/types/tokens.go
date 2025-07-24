package types

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SignupToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	TokStr    string             `bson:"tokStr"`
	Email     string             `bson:"email"`
	Phone     string             `bson:"phone"`
	Role      Role               `bson:"role"`
	PilotInfo *PilotInfo         `bson:"pilotInfo"`
	CreatedAt time.Time          `bson:"createdAt"`
	Expires   time.Time          `bson:"expires"`
}

var ErrSignupTokenNotExist = errors.New("Signup token does not exist")

type SignupTokenStore interface {
	CreateSignupToken(Phone, Email string, Role Role, PilotInfo *PilotInfo, Expiry time.Duration, ctx context.Context) (*SignupToken, error)
	GetSignupToken(TokStr string, ctx context.Context) (*SignupToken, error)
}
