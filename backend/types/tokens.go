package types

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SignupToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TokStr    string             `bson:"tok_str" json:"tok_str"`
	Email     string             `bson:"email" json:"email"`
	Phone     string             `bson:"phone" json:"phone"`
	Role      Role               `bson:"role" json:"role"`
	PilotInfo *PilotInfo         `bson:"pilot_info" json:"pilot_info"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	Expires   time.Time          `bson:"expires" json:"expires"`
}

var ErrSignupTokenNotExist = errors.New("Signup token does not exist")

type SignupTokenStore interface {
	CreateSignupToken(Phone, Email string, Role Role, PilotInfo *PilotInfo, Expiry time.Duration, ctx context.Context) (*SignupToken, error)
	GetSignupToken(TokStr string, ctx context.Context) (*SignupToken, error)
}
