package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EdgeNode struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	MAC       string             `bson:"mac"`
	APIKey    string             `bson:"apiKey"`
	PlaneInfo struct {
		TailNr string `bson:"tailNumber"`
	} `bson:"planeInfo"`
}

var ErrNodeNotExist = errors.New("Edge node does not exist")

type EdgeNodeStore interface {
	GetNodeByMAC(MAC string, ctx context.Context) (*EdgeNode, error)
	GetNodeByID(ID primitive.ObjectID, ctx context.Context) (*EdgeNode, error)
	GetNodeByKey(APIKey string, ctx context.Context) (*EdgeNode, error)
	CreateEdgeNode(node EdgeNode, ctx context.Context) (*EdgeNode, error)
}
