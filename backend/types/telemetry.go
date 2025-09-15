package types

import "time"

type HeartRateValues struct {
	HeartRate           float64 `bson:"hr" json:"hr"`
	HRBaselineDeviation float64 `bson:"baseline_deviation" json:"baseline_deviation"`
	RMSSD               float64 `bson:"rmssd" json:"rmssd"`
	HeartRateTrend      float64 `bson:"hr_trend" json:"hr_trend"`
}

type EnvironmentValues struct {
	Temperature float64 `bson:"temp" json:"temp"`
	Humidity    float64 `bson:"humidity" json:"humidity"`
	Altitude    float64 `bson:"altitude" json:"altitude"`
}

type EyeValues struct {
	AverageEAR      float64 `bson:"avg_ear" json:"avg_ear"`
	EyesClosed      bool    `bson:"eyes_closed" json:"eyes_closed"`
	ClosureDuration float64 `bson:"closure_duration" json:"closure_duration"`
	MicrosleepCount int     `bson:"microsleep_count" json:"microsleep_count"`
	BlinksPerMinute float64 `bson:"blink_rate_per_minute" json:"blink_rate_per_minute"`
}

type MotionValues struct {
	XAccel float64 `bson:"accel_x" json:"accel_x"`
	YAccel float64 `bson:"accel_y" json:"accel_y"`
	ZAccel float64 `bson:"accel_z" json:"accel_z"`

	XRot float64 `bson:"gyro_x" json:"gyro_x"`
	YRot float64 `bson:"gyro_y" json:"gyro_y"`
	ZRot float64 `bson:"gyro_z" json:"gyro_z"`

	ClimbRate float64 `bson:"altitude_change_rate" json:"altitude_change_rate"`
}

type TelemetryMessage struct {
	Timestamp   time.Time `bson:"timestamp" json:"timestamp"`
	StressIndex float64   `bson:"stress_index" json:"stress_index"`
	FusionScore float64   `bson:"fusion_score" json:"fusion_score"`

	HeartRateValues
	EnvironmentValues
	EyeValues
	MotionValues
}
