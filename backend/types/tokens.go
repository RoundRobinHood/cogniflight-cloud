package types

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SignupToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	TokStr    string             `bson:"tok_str" json:"tok_str,omitempty"`
	Email     string             `bson:"email,omitempty" json:"email,omitempty"`
	Phone     string             `bson:"phone,omitempty" json:"phone,omitempty"`
	Role      Role               `bson:"role" json:"role,omitempty"`
	PilotInfo *PilotInfo         `bson:"pilot_info,omitempty" json:"pilot_info,omitempty"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at,omitzero"`
	Expires   time.Time          `bson:"expires_at" json:"expires_at,omitzero"`
}

var ErrSignupTokenNotExist = errors.New("Signup token does not exist")

type SignupTokenStore interface {
	CreateSignupToken(Phone, Email string, Role Role, PilotInfo *PilotInfo, Expiry time.Duration, ctx context.Context) (*SignupToken, error)
	GetSignupToken(TokStr string, ctx context.Context) (*SignupToken, error)
}
