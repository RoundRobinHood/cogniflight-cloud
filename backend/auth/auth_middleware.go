package auth

import (
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
)

func AuthMiddleware(s types.SessionStore, allowedRoles map[types.Role]struct{}) gin.HandlerFunc {
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
