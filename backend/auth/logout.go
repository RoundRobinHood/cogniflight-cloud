package auth

import (
	"errors"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func Logout(s types.SessionStore) gin.HandlerFunc {
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

		secure_session := false
		if os.Getenv("IS_HTTPS") == "TRUE" {
			secure_session = true
		}
		domain := os.Getenv("DOMAIN")

		c.SetCookie("sessid", "", -1, "/", domain, secure_session, true)

		if _, err := s.DeleteSession(sess.SessID, c.Request.Context()); err != nil {
			if !errors.Is(err, types.ErrSessionNotExist) {
				l.Printf("Error logging out: %q", err.Error())
			}
		}

		c.JSON(200, gin.H{"error": "Internal error"})
	}
}
