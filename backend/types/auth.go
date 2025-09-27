package types

// AuthorizationStatus describes what prior auth middleware could determine about the current request.
// If Sess != nil, it's a valid user request that corresponds to that Session object
// If Key != nil, it's a request with a valid API Key, as stipiulated in the APIKey object
// If both are nil, then this request has no valid authorization
type AuthorizationStatus struct {
	Username string
	Tags     []string
}
