package auth

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/gin-gonic/gin"
)

func CheckAuthStatus(c *gin.Context) types.AuthorizationStatus {
	var status types.AuthorizationStatus
	if sess_get, ok := c.Get("sess"); ok {
		sess, ok := sess_get.(*types.Session)
		if ok {
			status.Sess = sess
		}
	}
	if key_get, ok := c.Get("key"); ok {
		key, ok := key_get.(types.APIKey)
		if ok {
			status.Key = &key
		}
	}

	return status
}
