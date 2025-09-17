package auth

import (
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func Login(u types.UserStore, s types.SessionStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		var req struct {
			Email string `json:"email"`
			Pwd   string `json:"pwd"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.Status(400)
			return
		}

		l.Set("email", req.Email)

		user, err := u.GetUserByEmail(req.Email, c.Request.Context())
		if err != nil {
			c.Status(401)
			l.Printf("Error getting user: %v", err)
			return
		}

		if util.CheckPwd(user.Pwd, req.Pwd) {
			secure_session := false
			if os.Getenv("IS_HTTPS") == "TRUE" {
				secure_session = true
			}
			domain := os.Getenv("DOMAIN")

			sess, err := s.CreateSession(user.ID, user.Role, c.Request.Context())
			if err != nil {
				l.Set("err", err)
				c.Status(500)
				return
			}
			c.Status(200)
			c.SetCookie("sessid", sess.SessID, 3600, "/", domain, secure_session, true)
		} else {
			c.Status(401)
		}
	}
}
