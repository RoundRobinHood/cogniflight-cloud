package types

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Alert struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	PilotID   primitive.ObjectID `bson:"pilot_id" json:"pilot_id"`
	Timestamp time.Time          `bson:"timestamp" json:"timestamp"`

	FusionScore    float64 `bson:"fusion_score" json:"fusion_score"`
	Interpretation string  `bson:"interpretation" json:"interpretation"`

	UserExplanation string `bson:"user_explanation" json:"user_explanation"`
}
