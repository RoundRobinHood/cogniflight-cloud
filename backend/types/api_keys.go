package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type APIKey struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty"`
	Salt           primitive.Binary    `bson:"salt"`
	HashIterations int                 `bson:"hash_iterations"`
	Key            primitive.Binary    `bson:"key"`
	EdgeID         *primitive.ObjectID `bson:"edge_id,omitempty"`
}

var ErrKeyNotExist = errors.New("API key does not exist")
var ErrKeyInvalid = errors.New("API key is invalid")

type APIKeyStore interface {
	Authenticate(APIKey string, ctx context.Context) (*APIKey, error)
	ListKeys(page, pageSize int, ctx context.Context) ([]APIKey, error)
	GetKey(ID primitive.ObjectID, ctx context.Context) (*APIKey, error)
	CreateKey(edgeID *primitive.ObjectID, ctx context.Context) (string, *APIKey, error)
	DeleteKey(ID primitive.ObjectID, ctx context.Context) (*APIKey, error)
}
