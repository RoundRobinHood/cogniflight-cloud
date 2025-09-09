package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type APIKey struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty" json:"_id,omitempty"`
	Salt           primitive.Binary    `bson:"salt" json:"salt"`
	HashIterations int                 `bson:"hash_iterations" json:"hash_iterations"`
	Key            primitive.Binary    `bson:"key" json:"key"`
	EdgeID         *primitive.ObjectID `bson:"edge_node,omitempty" json:"edge_node,omitempty"`
}

var ErrKeyNotExist = errors.New("API key does not exist")
var ErrKeyInvalid = errors.New("API key is invalid")

type APIKeyStore interface {
	Authenticate(APIKey string, ctx context.Context) (*APIKey, error)
	CreateKey(edgeID *primitive.ObjectID, ctx context.Context) (string, *APIKey, error)
}
