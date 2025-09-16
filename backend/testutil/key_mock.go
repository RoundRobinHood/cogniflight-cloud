package testutil

import (
	"context"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FakeAPIKeyStore struct {
	Keys map[primitive.ObjectID]types.APIKey
}

func (s *FakeAPIKeyStore) Authenticate(APIKey string, ctx context.Context) (*types.APIKey, error) {
	if s.Keys == nil {
		s.Keys = map[primitive.ObjectID]types.APIKey{}
	}
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

	if keyObj, found := s.Keys[ID]; found {
		bytes, err := hex.DecodeString(key)
		if err != nil {
			return nil, types.ErrKeyInvalid
		}

		hash, err := util.HashKey([32]byte(keyObj.Salt.Data), [32]byte(bytes), keyObj.HashIterations, ctx)
		if err != nil {
			return nil, err
		}
		if subtle.ConstantTimeCompare(hash[:], keyObj.Key.Data) == 1 {
			return &keyObj, nil
		} else {
			return nil, types.ErrKeyNotExist
		}
	} else {
		return nil, types.ErrKeyNotExist
	}
}

func (s *FakeAPIKeyStore) ListKeys(page, pageSize int, ctx context.Context) ([]types.APIKey, error) {
	return nil, errors.New("TODO: implement ListKeys")
}

func (s *FakeAPIKeyStore) GetKey(ID primitive.ObjectID, ctx context.Context) (*types.APIKey, error) {
	if key, ok := s.Keys[ID]; !ok {
		return nil, types.ErrKeyNotExist
	} else {
		return &key, nil
	}
}

func (s *FakeAPIKeyStore) DeleteKey(ID primitive.ObjectID, ctx context.Context) (*types.APIKey, error) {
	if key, ok := s.Keys[ID]; ok {
		delete(s.Keys, ID)
		return &key, nil
	} else {
		return nil, types.ErrKeyNotExist
	}
}

func (s *FakeAPIKeyStore) CreateKey(edgeID *primitive.ObjectID, ctx context.Context) (string, *types.APIKey, error) {
	if s.Keys == nil {
		s.Keys = map[primitive.ObjectID]types.APIKey{}
	}
	key, keyObj, err := util.GenerateKey(ctx)
	if err != nil {
		return "", nil, err
	}

	keyObj.EdgeID = edgeID
	s.Keys[keyObj.ID] = *keyObj
	return fmt.Sprintf("%s-%x", keyObj.ID.Hex(), key), keyObj, nil
}
