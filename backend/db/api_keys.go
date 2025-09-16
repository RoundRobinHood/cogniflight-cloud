package db

import (
	"context"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DBAPIKeyStore struct {
	Col *mongo.Collection
}

func (s DBAPIKeyStore) Authenticate(APIKey string, ctx context.Context) (*types.APIKey, error) {
	if len(APIKey) != 89 {
		return nil, types.ErrKeyInvalid
	}

	id, key, found := strings.Cut(APIKey, "-")
	if !found {
		return nil, types.ErrKeyInvalid
	}

	if len(id) != 24 || len(key) != 64 {
		return nil, types.ErrKeyInvalid
	}

	ID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, types.ErrKeyInvalid
	}

	keyBytes, err := hex.DecodeString(key)
	if err != nil {
		return nil, types.ErrKeyInvalid
	}

	var result types.APIKey
	if err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&result); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrKeyNotExist
		} else {
			return nil, err
		}
	}

	hash, err := util.HashKey([32]byte(result.Salt.Data), [32]byte(keyBytes), result.HashIterations, ctx)
	if err != nil {
		return nil, err
	}
	if subtle.ConstantTimeCompare(hash[:], result.Key.Data) == 1 {
		return &result, nil
	} else {
		return nil, types.ErrKeyNotExist
	}
}

func (s DBAPIKeyStore) ListKeys(page, pageSize int, ctx context.Context) ([]types.APIKey, error) {
	cur, err := s.Col.Find(ctx, bson.M{},
		options.Find().
			SetSkip(int64((page-1)*pageSize)).
			SetLimit(int64(pageSize)).
			SetSort(bson.D{{Key: "_id", Value: 1}}),
	)

	if err != nil {
		return nil, err
	}

	result := make([]types.APIKey, 0, pageSize)

	for cur.Next(ctx) {
		var item types.APIKey
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		result = append(result, item)
	}

	if cur.Err() != nil {
		return nil, cur.Err()
	}

	return result, nil
}

func (s DBAPIKeyStore) GetKey(ID primitive.ObjectID, ctx context.Context) (*types.APIKey, error) {
	var result types.APIKey
	if err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&result); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrKeyNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBAPIKeyStore) CreateKey(edgeID *primitive.ObjectID, ctx context.Context) (string, *types.APIKey, error) {
	key, keyObj, err := util.GenerateKey(ctx)
	if err != nil {
		return "", nil, err
	}

	keyObj.EdgeID = edgeID

	_, err = s.Col.InsertOne(ctx, &keyObj)
	if err != nil {
		return "", nil, err
	}

	return fmt.Sprintf("%s-%x", keyObj.ID.Hex(), key), keyObj, nil
}

func (s DBAPIKeyStore) DeleteKey(ID primitive.ObjectID, ctx context.Context) (*types.APIKey, error) {
	var result types.APIKey
	if err := s.Col.FindOneAndDelete(ctx, bson.M{"_id": ID}).Decode(&result); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrKeyNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}
