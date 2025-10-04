package util

import (
	"context"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

func ChannelCtx(done <-chan struct{}) context.Context {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		select {
		case <-done:
			cancel()
		case <-ctx.Done():
		}
	}()

	return ctx
}

func GetAuthStatus(ctx context.Context) types.AuthorizationStatus {
	if obj := ctx.Value("auth_status"); obj == nil {
		panic("AuthorizationStatus missing from context")
	} else if status, ok := obj.(types.AuthorizationStatus); !ok {
		panic("auth_status wrong type")
	} else {
		return status
	}
}

func GetTags(ctx context.Context) []string {
	if obj := ctx.Value("tags"); obj == nil {
		panic("tags missing from context")
	} else if tags, ok := obj.([]string); !ok {
		panic("tags wrong type")
	} else {
		return tags
	}
}
