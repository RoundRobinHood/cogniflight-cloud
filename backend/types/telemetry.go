package types

import "time"

type HeartRateValues struct {
	HeartRate           float64 `json:"hr"`
	HRBaselineDeviation float64 `json:"baseline_deviation"`
	RMSSD               float64 `json:"rmssd"`
	HeartRateTrend      float64 `json:"hr_trend"`
}

type EnvironmentValues struct {
	Temperature float64 `json:"temp"`
	Humidity    float64 `json:"humidity"`
	Altitude    float64 `json:"altitude"`
}

type EyeValues struct {
	AverageEAR      float64 `json:"avg_ear"`
	EyesClosed      bool    `json:"eyes_closed"`
	ClosureDuration float64 `json:"closure_duration"`
	MicrosleepCount int     `json:"microsleep_count"`
	BlinksPerMinute float64 `json:"blink_rate_per_minute"`
}

type MotionValues struct {
	XAccel float64 `json:"accel_x"`
	YAccel float64 `json:"accel_y"`
	ZAccel float64 `json:"accel_z"`

	XRot float64 `json:"gyro_x"`
	YRot float64 `json:"gyro_y"`
	ZRot float64 `json:"gyro_z"`

	ClimbRate float64 `json:"altitude_change_rate"`
}

type TelemetryMessage struct {
	Timestamp   time.Time `json:"timestamp"`
	StressIndex float64   `json:"stress_index"`
	FusionScore float64   `json:"fusion_score"`

	HeartRateValues
	EnvironmentValues
	EyeValues
	MotionValues
}
