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

type Listable[Output, Filter any] interface {
	List(opts ListOptions[Filter], ctx context.Context) ([]Output, *HTTPError)
}

type IDGettable[Output any] interface {
	GetItem(ID primitive.ObjectID, ctx context.Context) (Output, *HTTPError)
}

type Creatable[Input, Output any] interface {
	Create(input Input, ctx context.Context) (Output, *HTTPError)
}

type IDUpdatable[Update, Output any] interface {
	Update(ID primitive.ObjectID, update Update, ctx context.Context) (Output, *HTTPError)
}

type IDDeleteable[Output any] interface {
	Delete(ID primitive.ObjectID, ctx context.Context) (Output, *HTTPError)
}

type Repository[Input, Update, Output, Filter any] interface {
	Listable[Output, Filter]
	IDGettable[Output]
	Creatable[Input, Output]
	IDUpdatable[Update, Output]
	IDDeleteable[Output]
}
