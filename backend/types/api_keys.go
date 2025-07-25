package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type APIKey struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty"`
	Salt           primitive.Binary    `bson:"salt"`
	HashIterations int                 `bson:"hashIterations"`
	Key            primitive.Binary    `bson:"keyStr"`
	EdgeID         *primitive.ObjectID `bson:"edgeNode,omitempty"`
}

var ErrKeyNotExist = errors.New("API key does not exist")
var ErrKeyInvalid = errors.New("API key is invalid")

type APIKeyStore interface {
	Authenticate(APIKey string, ctx context.Context) (*APIKey, error)
	CreateKey(ctx context.Context) (string, *APIKey, error)
}
