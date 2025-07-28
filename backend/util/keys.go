package util

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func HashKey(salt, key [32]byte, iterations int, ctx context.Context) ([32]byte, error) {
	for i, b := range salt {
		key[i] ^= b
	}

	for range iterations {
		if err := ctx.Err(); err != nil {
			return key, err
		}
		key = sha256.Sum256(key[:])
	}

	return key, nil
}

func GenerateKey(ctx context.Context) ([32]byte, *types.APIKey, error) {
	var salt, key [32]byte
	if _, err := rand.Read(key[:]); err != nil {
		return key, nil, err
	}
	if _, err := rand.Read(salt[:]); err != nil {
		return key, nil, err
	}

	hashIterations := 1000
	if iter := os.Getenv("HASH_ITERATIONS"); iter != "" {
		var num int
		if _, err := fmt.Sscan(iter, &num); err != nil {
			hashIterations = num
		}
	}

	hash, err := HashKey(salt, key, hashIterations, ctx)
	if err != nil {
		return key, nil, err
	}

	keyObj := types.APIKey{
		ID:             primitive.NewObjectID(),
		Salt:           primitive.Binary{Data: salt[:]},
		Key:            primitive.Binary{Data: hash[:]},
		HashIterations: hashIterations,
	}

	return key, &keyObj, nil
}
