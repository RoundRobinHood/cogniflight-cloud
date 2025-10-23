package types

type MQTTMessage struct {
	EdgeUsername string         `yaml:"edge_username"`
	Payload      map[string]any `yaml:"payload"`
}
