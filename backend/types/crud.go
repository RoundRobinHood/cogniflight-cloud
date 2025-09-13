package types

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type HTTPError struct {
	ErrorCode int
	Err       error
}

func HTTPWraps(err error, code int) *HTTPError {
	return &HTTPError{
		ErrorCode: code,
		Err:       err,
	}
}

var ErrRepositoryItemNotFound = errors.New("Item not found in repository")

type ListOptions[F any] struct {
	Page     int
	PageSize int
	Filter   F
}

type Repository[Input, Update, Output, Filter any] interface {
	// Listing
	List(opts ListOptions[Filter], ctx context.Context) ([]Output, *HTTPError)

	// Get by ID
	GetItem(ID primitive.ObjectID, ctx context.Context) (Output, *HTTPError)

	// Posting functions
	Create(input Input, ctx context.Context) (Output, *HTTPError)

	// Patching functions
	Update(ID primitive.ObjectID, update Update, ctx context.Context) (Output, *HTTPError)

	// Deleting functions
	Delete(ID primitive.ObjectID, ctx context.Context) (Output, *HTTPError)
}
