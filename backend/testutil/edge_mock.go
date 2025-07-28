package testutil

import (
	"context"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FakeEdgeNodeStore struct {
	Nodes   map[primitive.ObjectID]types.EdgeNode
	Created *types.EdgeNode
}

func (f *FakeEdgeNodeStore) GetNodeByID(ID primitive.ObjectID, ctx context.Context) (*types.EdgeNode, error) {
	if f.Nodes == nil {
		f.Nodes = map[primitive.ObjectID]types.EdgeNode{}
	}

	if node, exists := f.Nodes[ID]; exists {
		return &node, nil
	} else {
		return nil, types.ErrNodeNotExist
	}
}

func (f *FakeEdgeNodeStore) CreateEdgeNode(planeInfo types.PlaneInfo, ctx context.Context) (*types.EdgeNode, error) {
	if f.Nodes == nil {
		f.Nodes = map[primitive.ObjectID]types.EdgeNode{}
	}

	newNode := types.EdgeNode{
		ID:        primitive.NewObjectID(),
		PlaneInfo: planeInfo,
	}

	f.Created = &newNode
	f.Nodes[newNode.ID] = newNode
	return &newNode, nil
}
