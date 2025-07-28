package db

import (
	"context"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DBSessionStore struct {
	Col *mongo.Collection
}

func (s DBSessionStore) GetSession(SessID string, ctx context.Context) (*types.Session, error) {
	var result types.Session
	err := s.Col.FindOne(ctx, bson.M{"sess_id": SessID}).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrSessionNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBSessionStore) CreateSession(UserID primitive.ObjectID, Role types.Role, ctx context.Context) (*types.Session, error) {
	sessID, err := util.GenerateToken()
	if err != nil {
		return nil, err
	}

	session := types.Session{
		UserID:    UserID,
		SessID:    sessID,
		Role:      Role,
		CreatedAt: time.Now(),
	}

	inserted, err := s.Col.InsertOne(ctx, &session)
	session.ID = inserted.InsertedID.(primitive.ObjectID)

	return &session, nil
}
