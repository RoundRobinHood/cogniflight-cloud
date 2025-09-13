package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var ErrRepositoryItemNotFound = errors.New("Item not found in repository")

type ListOptions[F any] struct {
	Page     int
	PageSize int
	Filter   F
}

type Repository[Input, Update, Output, Filter any] interface {
	// Listing functions
	ValidateFilter(filter Filter, ctx context.Context) error
	List(opts ListOptions[Filter], ctx context.Context) ([]Output, error)

	// Get by ID
	GetItem(ID primitive.ObjectID, ctx context.Context) (Output, error)

	// Posting functions
	ValidateInput(input Input, ctx context.Context) error
	Create(input Input, ctx context.Context) (Output, error)

	// Patching functions
	ValidateUpdate(update Update, ctx context.Context) error
	Update(update Update, ctx context.Context) (Output, error)

	// Deleting functions
	Delete(ID primitive.ObjectID, ctx context.Context) (Output, error)
}
