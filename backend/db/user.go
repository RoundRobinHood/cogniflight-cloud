package db

import (
	"context"

	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DBUserStore struct {
	Col *mongo.Collection
}

func (s DBUserStore) GetUserByEmail(email string, ctx context.Context) (*types.User, error) {
	var result types.User
	err := s.Col.FindOne(ctx, bson.M{"email": email}).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrUserNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBUserStore) GetUserByID(ID primitive.ObjectID, ctx context.Context) (*types.User, error) {
	var result types.User
	err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrUserNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBUserStore) CreateUser(User types.User, ctx context.Context) (*types.User, error) {
	inserted, err := s.Col.InsertOne(ctx, &User)
	if err != nil {
		return nil, err
	}
	User.ID = inserted.InsertedID.(primitive.ObjectID)

	return &User, nil
}
