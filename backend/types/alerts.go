package types

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Alert struct {
	PilotID   primitive.ObjectID `json:"pilot_id"`
	Timestamp time.Time          `json:"timestamp"`

	FusionScore    float64 `json:"fusion_score"`
	Interpretation string  `json:"interpretation"`

	UserExplanation string `json:"user_explanation"`
}
