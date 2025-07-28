package types

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Flight struct {
	ID       primitive.ObjectID `bson:"_id,omitempty"`
	EdgeNode primitive.ObjectID `bson:"edgeID"`
	Pilot    primitive.ObjectID `bson:"pilotID"`
	Start    time.Time          `bson:"startTime"`
	Duration time.Duration      `bson:"duration"`
}
