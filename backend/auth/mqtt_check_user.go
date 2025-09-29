package auth

import (
	"crypto/subtle"
	"os"
	"slices"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/goccy/go-yaml"
)

func CheckMQTTUser(filestore filesystem.Store) gin.HandlerFunc {
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

		clientID := req.ClientID

		if clientID == "telegraf-mqtt" {
			if key := os.Getenv("MQTT_KEY"); key != "" && subtle.ConstantTimeCompare([]byte(key), []byte(req.Password)) == 1 {
				l.Printf("Authenticated with env key")
				c.Status(200)
				return
			} else {
				c.Status(401)
				l.Printf("Attempted to authenticate with env key")
				return
			}
		}

		clean_path, err := filesystem.AbsPath("/etc/passwd", req.Username+".login")
		if err != nil {
			l.Printf("Invalid path: %v", err)
			c.Status(401)
			return
		}
		if !strings.HasPrefix(clean_path, "/etc/passwd/") {
			l.Printf("path traversal: path doesn't start with /etc/passwd/")
			c.Status(401)
			return
		}

		bytes, err := filestore.LookupReadAll(c.Request.Context(), clean_path, []string{"sysadmin"})
		if err != nil {
			l.Printf("failed to read login file: %v", err)
			c.Status(401)
			return
		}

		var cred types.CredentialsEntry
		if err := yaml.Unmarshal(bytes, &cred); err != nil {
			l.Printf("login file contains invalid YAML: %v", err)
			c.Status(401)
			return
		}

		if !util.CheckPwd(cred.Password, req.Password) {
			l.Printf("Wrong pwd")
			c.Status(401)
			return
		}

		if !slices.Contains(cred.Tags, "edge-node") {
			l.Printf("Not edge-node user")
			c.Status(401)
			return
		}

		c.Status(200)
	}
}
