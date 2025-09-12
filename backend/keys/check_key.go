package keys

import (
	"crypto/subtle"
	"errors"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func CheckKey(k types.APIKeyStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)

		var req struct {
			ClientID string `json:"clientid" binding:"required"`
			Password string `json:"password" binding:"required"`
			Username string `json:"username" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.Status(400)
			l.Printf("Invalid body: %v", err)
			return
		}

		username := req.Username
		password := req.Password

		if username != password {
			c.Status(401)
			return
		}

		if key := os.Getenv("MQTT_KEY"); key != "" {
			if subtle.ConstantTimeCompare([]byte(key), []byte(username)) == 1 {
				l.Printf("Authenticated with env key")
				c.Status(200)
				return
			}
		}

		if _, err := k.Authenticate(username, c.Request.Context()); err != nil {
			if errors.Is(err, types.ErrKeyNotExist) || errors.Is(err, types.ErrKeyInvalid) {
				c.Status(401)
			} else {
				c.Status(500)
			}
			return
		}

		l.Printf("Authenticated with edge-node key")
		c.Status(200)
	}
}
