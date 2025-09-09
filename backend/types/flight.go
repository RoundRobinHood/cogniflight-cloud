package types

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Flight struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	EdgeID   primitive.ObjectID `bson:"edge_id" json:"edge_id"`
	PilotID  primitive.ObjectID `bson:"pilot_id" json:"pilot_id"`
	Start    time.Time          `bson:"start_time" json:"start_time"`
	Duration time.Duration      `bson:"duration" json:"duration"`
}
