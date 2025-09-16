package keys

import (
	"context"
	"errors"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type KeyRepository struct {
	Store types.APIKeyStore
}

type KeyInfo struct {
	ID     primitive.ObjectID  `json:"id"`
	EdgeID *primitive.ObjectID `json:"edge_id"`
	KeyStr string              `json:"key_str,omitempty"`
}

func (k *KeyRepository) List(opts types.ListOptions[struct{}], authStatus types.AuthorizationStatus, ctx context.Context) ([]KeyInfo, *types.HTTPError) {
	if keys, err := k.Store.ListKeys(opts.Page, opts.PageSize, ctx); err != nil {
		return nil, &types.HTTPError{
			ErrorCode: 500,
			Err:       err,
		}
	} else {
		output := make([]KeyInfo, len(keys))
		for i := range len(keys) {
			output[i] = KeyInfo{
				ID:     keys[i].ID,
				EdgeID: keys[i].EdgeID,
			}
		}
		return output, nil
	}
}

func (k *KeyRepository) GetItem(ID primitive.ObjectID, authStatus types.AuthorizationStatus, ctx context.Context) (KeyInfo, *types.HTTPError) {
	var zero KeyInfo
	if key, err := k.Store.GetKey(ID, ctx); err != nil {
		if errors.Is(err, types.ErrKeyNotExist) {
			return zero, &types.HTTPError{
				ErrorCode: 404,
				Err:       err,
			}
		} else {
			return zero, &types.HTTPError{
				ErrorCode: 500,
				Err:       err,
			}
		}
	} else {
		return KeyInfo{
			ID:     key.ID,
			EdgeID: key.EdgeID,
		}, nil
	}
}

type KeyCreationInfo struct {
	EdgeID *primitive.ObjectID `json:"edge_id,omitempty"`
}

func (k *KeyRepository) Create(input KeyCreationInfo, authStatus types.AuthorizationStatus, ctx context.Context) (KeyInfo, *types.HTTPError) {
	var zero KeyInfo
	if keyStr, key, err := k.Store.CreateKey(input.EdgeID, ctx); err != nil {
		return zero, &types.HTTPError{
			ErrorCode: 500,
			Err:       err,
		}
	} else {
		return KeyInfo{
			ID:     key.ID,
			EdgeID: key.EdgeID,
			KeyStr: keyStr,
		}, nil
	}
}

func (k *KeyRepository) Delete(ID primitive.ObjectID, authStatus types.AuthorizationStatus, ctx context.Context) (KeyInfo, *types.HTTPError) {
	var zero KeyInfo
	if key, err := k.Store.DeleteKey(ID, ctx); err != nil {
		if errors.Is(err, types.ErrKeyNotExist) {
			return zero, &types.HTTPError{
				ErrorCode: 404,
				Err:       err,
			}
		} else {
			return zero, &types.HTTPError{
				ErrorCode: 500,
				Err:       err,
			}
		}
	} else {
		return KeyInfo{
			ID:     key.ID,
			EdgeID: key.EdgeID,
		}, nil
	}
}
