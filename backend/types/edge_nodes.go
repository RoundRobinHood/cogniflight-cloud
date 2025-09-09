package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PlaneInfo struct {
	TailNr       string `bson:"tail_number" json:"tail_number" binding:"required"`
	Manufacturer string `bson:"manufacturer" json:"manufacturer" binding:"required"`
	Model        string `bson:"model" json:"model" binding:"required"`
	Year         int    `bson:"year" json:"year" binding:"required"`
}

type EdgeNode struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PlaneInfo PlaneInfo          `bson:"plane_info" json:"plane_info"`
}

var ErrNodeNotExist = errors.New("Edge node does not exist")

type EdgeNodeStore interface {
	GetNodeByID(ID primitive.ObjectID, ctx context.Context) (*EdgeNode, error)
	CreateEdgeNode(planeInfo PlaneInfo, ctx context.Context) (*EdgeNode, error)
}
