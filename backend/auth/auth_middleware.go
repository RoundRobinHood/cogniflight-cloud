package auth

import (
	"errors"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func UserAuthMiddleware(s types.SessionStore, allowedRoles map[types.Role]struct{}) gin.HandlerFunc {
	if allowedRoles == nil {
		panic("allowedRoles == nil on AuthMiddleware")
	}
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)

		sess_id, err := c.Cookie("sessid")
		if err != nil {
			c.AbortWithStatus(401)
			return
		}

		sess, err := s.GetSession(sess_id, c.Request.Context())
		if err != nil {
			c.AbortWithStatus(401)
			return
		}

		if _, ok := allowedRoles[sess.Role]; !ok {
			c.AbortWithStatus(403)
			return
		}

		l.Set("role", sess.Role)
		l.Set("userId", sess.UserID)
		c.Set("sess", sess)
	}
}

func KeyAuthMiddleware(s types.APIKeyStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatus(401)
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatus(401)
		}

		key, err := s.Authenticate(strings.TrimPrefix(authHeader, "Bearer "), c.Request.Context())

		if err != nil {
			if errors.Is(err, types.ErrKeyInvalid) || errors.Is(err, types.ErrKeyNotExist) {
				c.AbortWithStatus(401)
			} else {
				c.AbortWithStatus(500)
			}
		}

		c.Set("key", *key)
	}
}
