package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PlaneInfo struct {
	TailNr string `bson:"tailNumber" json:"tailNumber" binding:"required"`
}

type EdgeNode struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PlaneInfo PlaneInfo          `bson:"planeInfo" json:"planeInfo"`
}

var ErrNodeNotExist = errors.New("Edge node does not exist")

type EdgeNodeStore interface {
	GetNodeByID(ID primitive.ObjectID, ctx context.Context) (*EdgeNode, error)
	CreateEdgeNode(planeInfo PlaneInfo, ctx context.Context) (*EdgeNode, error)
}
