package db

import (
	"context"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DBEdgeNodeStore struct {
	Col *mongo.Collection
}

func (s DBEdgeNodeStore) GetNodeByID(ID primitive.ObjectID, ctx context.Context) (*types.EdgeNode, error) {
	var result types.EdgeNode

	if err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&result); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrNodeNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBEdgeNodeStore) CreateEdgeNode(planeInfo types.PlaneInfo, ctx context.Context) (*types.EdgeNode, error) {
	edgeNode := types.EdgeNode{
		ID:        primitive.NewObjectID(),
		PlaneInfo: planeInfo,
	}

	if _, err := s.Col.InsertOne(ctx, &edgeNode); err != nil {
		return nil, err
	} else {
		return &edgeNode, nil
	}
}
