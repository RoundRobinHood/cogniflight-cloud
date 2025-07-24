package auth

import (
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
)

func WhoAmI(s types.SessionStore, u types.UserStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		sess_get, ok := c.Get("sess")
		if !ok {
			l.Printf("No auth middleware")
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		}

		sess := sess_get.(*types.Session)
		l.Set("userID", sess.UserID)
		user, err := u.GetUserByID(sess.UserID, c.Request.Context())
		if err != nil {
			l.Printf("Failed to get user from valid session: %s", err)
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		}

		c.JSON(200, types.UserInfo{
			ID:    sess.UserID,
			Name:  user.Name,
			Email: user.Email,
			Phone: user.Phone,
			Role:  user.Role,
		})
	}
}
