package db

import (
	"errors"
	"strings"

	"go.mongodb.org/mongo-driver/mongo"
)

// isValidationError reports whether err looks like a Mongo validation or write error
// that should be returned as a 400 (bad request).
func IsValidationError(err error) bool {
	var we mongo.WriteException
	if errors.As(err, &we) {
		for _, writeErr := range we.WriteErrors {
			// Classic schema validation error message
			if strings.Contains(writeErr.Message, "Document failed validation") {
				return true
			}
			// You can add other codes/messages you want to treat as 400
			// e.g. duplicate key
			if writeErr.Code == 11000 {
				return true
			}
		}
	}

	var ce mongo.CommandError
	if errors.As(err, &ce) {
		if strings.Contains(ce.Message, "Document failed validation") {
			return true
		}
	}

	return false
}
