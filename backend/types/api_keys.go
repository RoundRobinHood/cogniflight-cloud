package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type APIKey struct {
	ID     primitive.ObjectID  `bson:"_id,omitempty"`
	KeyStr string              `bson:"keyStr"`
	EdgeID *primitive.ObjectID `bson:"edgeNode,omitempty"`
}

var ErrKeyNotExist = errors.New("API key does not exist")

type APIKeyStore interface {
	GetKey(APIKey string, ctx context.Context) (*APIKey, error)
	CreateKey(APIKey string, ctx context.Context) (*APIKey, error)
}
