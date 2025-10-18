package auth

import (
	"os"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/goccy/go-yaml"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func Login(filestore filesystem.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		var req struct {
			Username string `json:"username" binding:"required"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			l.Printf("Invalid body: %v", err)
			c.JSON(400, gin.H{"error": err.Error()})
			return
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

		sessID, err := util.GenerateToken()
		if err != nil {
			l.Printf("failed to generate sessID: %v", err)
			c.Status(401)
			return
		}

		fileRef := primitive.NewObjectID()
		stream, err := filestore.Bucket.OpenUploadStreamWithID(fileRef, "")
		if err != nil {
			l.Printf("couldn't open upload stream for sess file: %v", err)
			c.Status(401)
			return
		}

		if _, err := stream.Write([]byte(req.Username)); err != nil {
			stream.Close()
			l.Printf("couldn't write username to bucket: %v", err)
			c.Status(401)
			return
		}
		if err := stream.Close(); err != nil {
			l.Printf("error closing bucket upload stream: %v", err)
			c.Status(401)
			return
		}

		sessfolder, err := filestore.Lookup(c.Request.Context(), []string{"sysadmin"}, "/etc/sess")
		if err != nil {
			l.Printf("couldn't get sess folder: %v", err)
			c.Status(401)
			return
		}

		if _, err := filestore.WriteFile(c.Request.Context(), sessfolder.ID, sessID+".sess", fileRef, []string{"sysadmin"}); err != nil {
			l.Printf("couldn't write sess file: %v", err)
			c.Status(401)
			return
		}

		secure_session := false
		if os.Getenv("IS_HTTPS") == "TRUE" {
			secure_session = true
		}
		domain := os.Getenv("DOMAIN")

		c.Status(200)
		c.SetCookie("sessid", sessID, 3600, "/", domain, secure_session, true)
	}
}
