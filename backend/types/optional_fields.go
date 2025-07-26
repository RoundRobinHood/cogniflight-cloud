package types

import (
	"encoding/json"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/bsontype"
)

// OptionalField is a helper type that enables functions to distinguish between
// fields that are provided as null, and fields that aren't Provided.
// This is used for optional fields in update typedefs
type OptionalField[T any] struct {
	Value    T
	Provided bool
}

func (f *OptionalField[T]) UnmarshalJSON(bytes []byte) error {
	f.Provided = true
	return json.Unmarshal(bytes, &f.Value)
}

func (f OptionalField[T]) MarshalJSON() ([]byte, error) {
	return json.Marshal(f.Value)
}

func (f OptionalField[T]) IsZero() bool {
	return !f.Provided
}

func (f OptionalField[T]) MarshalBSONValue() (bsontype.Type, []byte, error) {
	if !f.Provided {
		return bson.TypeUndefined, nil, nil
	}
	return bson.MarshalValue(f.Value)
}

func (f *OptionalField[T]) UnmarshalBSONValue(t bsontype.Type, data []byte) error {
	f.Provided = true
	return bson.UnmarshalValue(t, data, &f.Value)
}
