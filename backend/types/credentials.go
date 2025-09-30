package types

type CredentialsEntry struct {
	Password string   `yaml:"password"`
	Tags     []string `yaml:"tags"`
}

type UserMetadata struct {
	Email string `yaml:"email"`
	Phone string `yaml:"phone"`
	Role  string `yaml:"role"`
}
