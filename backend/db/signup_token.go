package db

import (
	"context"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DBSignupTokenStore struct {
	Col *mongo.Collection
}

func (s DBSignupTokenStore) GetSignupToken(TokStr string, ctx context.Context) (*types.SignupToken, error) {
	var result types.SignupToken
	err := s.Col.FindOne(ctx, bson.M{"tokStr": TokStr}).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrSignupTokenNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBSignupTokenStore) CreateSignupToken(Phone, Email string, Role types.Role, Expiry time.Duration, ctx context.Context) (*types.SignupToken, error) {
	tokStr, err := GenerateToken()
	if err != nil {
		return nil, err
	}

	tok := types.SignupToken{
		TokStr:    tokStr,
		Email:     Email,
		Phone:     Phone,
		Role:      Role,
		CreatedAt: time.Now(),
		Expires:   time.Now().Add(Expiry),
	}

	inserted, err := s.Col.InsertOne(ctx, &tok)
	if err != nil {
		return nil, err
	}
	tok.ID = inserted.InsertedID.(primitive.ObjectID)

	return &tok, nil
}
