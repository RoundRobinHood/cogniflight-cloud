package auth

import (
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/goccy/go-yaml"
)

func AuthMiddleware(filestore filesystem.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)

		sess_id, err := c.Cookie("sessid")
		if err != nil {
			c.AbortWithStatus(401)
			return
		}
		l.Set("sess", sess_id)

		clean_path, err := filesystem.AbsPath("/etc/sess", sess_id+".sess")
		if err != nil {
			l.Printf("invalid path: %v", err)
			c.AbortWithStatus(401)
			return
		}
		if !strings.HasPrefix(clean_path, "/etc/sess/") {
			l.Printf("path traversal: cleaned path doesn't start with /etc/sess/")
			c.AbortWithStatus(401)
			return
		}

		if bytes, err := filestore.LookupReadAll(c.Request.Context(), clean_path, []string{"sysadmin"}); err != nil {
			l.Printf("failed to read sess file: %v", err)
			c.AbortWithStatus(401)
			return
		} else {
			username := string(bytes)
			clean_path, err := filesystem.AbsPath("/etc/passwd", username+".login")
			if err != nil {
				l.Printf("invalid loginfile path: %v", err)
				c.AbortWithStatus(401)
				return
			}
			if !strings.HasPrefix(clean_path, "/etc/passwd/") {
				l.Printf("path traversal: cleaned path doesn't start with /etc/passwd/ (%q)", clean_path)
				c.AbortWithStatus(401)
				return
			}
			if bytes, err := filestore.LookupReadAll(c.Request.Context(), clean_path, []string{"sysadmin"}); err != nil {
				l.Printf("failed to read login file: %v", err)
				c.AbortWithStatus(401)
				return
			} else {
				credentials := types.CredentialsEntry{}
				if err := yaml.Unmarshal(bytes, &credentials); err != nil {
					l.Printf("invalid login file YAML: %v", err)
					c.AbortWithStatus(401)
					return
				}

				c.Set("auth", types.AuthorizationStatus{
					Username: username,
					Tags:     credentials.Tags,
				})
			}
		}
	}
}
