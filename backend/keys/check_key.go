package keys

import (
	"errors"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func CheckKey(k types.APIKeyStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)

		username, userProvided := c.GetPostForm("username")
		password, passProvided := c.GetPostForm("password")

		l.Set("username", username)
		l.Set("password", password)

		if !userProvided || !passProvided || username != password {
			c.Status(401)
			return
		}

		if _, err := k.Authenticate(username, c.Request.Context()); err != nil {
			if errors.Is(err, types.ErrKeyNotExist) || errors.Is(err, types.ErrKeyInvalid) {
				c.Status(401)
			} else {
				c.Status(500)
			}
			return
		}

		c.Status(200)
	}
}
