package types

// AuthorizationStatus describes what prior auth middleware could determine about the current request.
type AuthorizationStatus struct {
	Username string
	Tags     []string
	SessID   string `yaml:"-" json:"-"`
}
