package auth

import (
	"errors"
	"fmt"
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

func SignupCheckUsername(filestore filesystem.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		signup_token := c.Query("token")
		if signup_token == "" {
			c.Status(401)
			return
		}

		clean_path, err := filesystem.AbsPath("/etc/passwd", signup_token+".signup")
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

		// For this endpoint, only make sure that the file actually exists (no need to read it yet)
		if _, err := filestore.Lookup(c.Request.Context(), []string{"sysadmin"}, clean_path); err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				l.Printf("lookup error: %v", err)
			}
			c.Status(401)
			return
		}

		username := c.Param("username")
		if username == "" {
			c.Status(400)
			return
		}

		passwd_path, err := filesystem.AbsPath("/etc/passwd", username+".login")
		if err != nil {
			l.Printf("Invalid path: %v", err)
			c.Status(400)
			return
		}
		if !strings.HasPrefix(passwd_path, "/etc/passwd/") {
			l.Printf("path traversal: username passwd_path doesn't start with /etc/passwd/")
			c.Status(400)
			return
		}

		home_path, err := filesystem.AbsPath("/home", username)
		if err != nil {
			l.Printf("Invalid path: %v", err)
			c.Status(400)
			return
		}
		if !strings.HasPrefix(home_path, "/home/") {
			l.Printf("path traversal: username home_path doesn't start with /home/")
			c.Status(400)
			return
		}

		if _, err := filestore.Lookup(c.Request.Context(), []string{"sysadmin"}, passwd_path); err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				l.Printf("failed to lookup passwd: %v", err)
				c.Status(500)
				return
			}
		} else {
			c.Status(409)
			return
		}

		if _, err := filestore.Lookup(c.Request.Context(), []string{"sysadmin"}, home_path); err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				l.Printf("failed to lookup home folder: %v", err)
				c.Status(500)
				return
			}
		} else {
			c.Status(409)
			return
		}

		c.Status(200)
	}
}

func Signup(filestore filesystem.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		var req struct {
			Username string `json:"username" binding:"required"`
			Password string `json:"password" binding:"required"`
			TokStr   string `json:"token" binding:"required"`
		}
		if err := c.BindJSON(&req); err != nil {
			l.Printf("gin: %v", err)
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		clean_path, err := filesystem.AbsPath("/etc/passwd", req.TokStr+".signup")
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

		signup_bytes, err := filestore.LookupReadAll(c.Request.Context(), clean_path, []string{"sysadmin"})
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				l.Printf("error looking up signup file: %v", err)
			}
			c.Status(401)
			return
		}
		var SignupFile struct {
			Tags            []string                  `yaml:"tags"`
			HomePermissions *types.FsEntryPermissions `yaml:"home_permissions"`
			Extra           map[string]any            `yaml:",inline"`
		}
		if err := yaml.Unmarshal(signup_bytes, &SignupFile); err != nil {
			l.Printf("invalid signup YAML: %v", err)
			c.Status(401)
			return
		}
		delete(SignupFile.Extra, "tags")
		delete(SignupFile.Extra, "home_permissions")
		if len(SignupFile.Tags) == 0 {
			l.Printf("signup file has no tags")
			c.Status(401)
			return
		}

		password_hash, err := util.HashPwd(req.Password)
		if err != nil {
			l.Printf("Failed to hash password: %v", err)
			c.Status(500)
			return
		}

		// Beyond this point, the person is authenticated as "desiring to signup with these tags"
		owner_tag := fmt.Sprintf("user-%s", req.Username)
		user_tags := append(SignupFile.Tags, owner_tag)
		var home_permissions types.FsEntryPermissions
		if SignupFile.HomePermissions == nil {
			home_permissions = types.FsEntryPermissions{
				ReadTags:             []string{"sysadmin", owner_tag},
				WriteTags:            []string{"sysadmin", owner_tag},
				ExecuteTags:          []string{"sysadmin", owner_tag},
				UpdatePermissionTags: []string{"sysadmin", owner_tag},
			}
		} else {
			home_permissions = *SignupFile.HomePermissions
		}
		passwd_path, err := filesystem.AbsPath("/etc/passwd", req.Username+".login")
		if err != nil {
			l.Printf("Invalid path: %v", err)
			c.Status(400)
			return
		}
		if !strings.HasPrefix(passwd_path, "/etc/passwd/") {
			l.Printf("path traversal: username passwd_path doesn't start with /etc/passwd/")
			c.Status(400)
			return
		}

		home_path, err := filesystem.AbsPath("/home", req.Username)
		if err != nil {
			l.Printf("Invalid path: %v", err)
			c.Status(400)
			return
		}
		if !strings.HasPrefix(home_path, "/home/") {
			l.Printf("path traversal: username home_path doesn't start with /home/")
			c.Status(400)
			return
		}

		// Now paths have been validated, start with heavier DB work
		home_folder, err := filestore.Lookup(c.Request.Context(), []string{"sysadmin"}, "/home")
		if err != nil {
			l.Printf("failed to lookup /home: %v", err)
			c.Status(500)
			return
		}
		passwd_folder, err := filestore.Lookup(c.Request.Context(), []string{"sysadmin"}, "/etc/passwd")
		if err != nil {
			l.Printf("failed to lookup /etc/passwd: %v", err)
			c.Status(500)
			return
		}

		// Check that the file & folder don't already exist
		if _, ok := home_folder.Entries.Get(req.Username); ok {
			c.Status(409)
			return
		}
		if _, ok := passwd_folder.Entries.Get(req.Username); ok {
			c.Status(409)
			return
		}

		loginFile := types.CredentialsEntry{
			Password: password_hash,
			Tags:     SignupFile.Tags,
		}
		login_bytes, err := util.YamlCRLF(loginFile)
		if err != nil {
			l.Printf("failed to marshal login YAML: %v", err)
			c.Status(500)
			return
		}

		user_profile_bytes, err := util.YamlCRLF(SignupFile.Extra)
		if err != nil {
			l.Printf("failed to marshal user.profile YAML: %v", err)
			c.Status(500)
			return
		}

		// Upload login file
		loginFileRef := primitive.NewObjectID()
		stream, err := filestore.Bucket.OpenUploadStreamWithID(loginFileRef, "")
		if err != nil {
			l.Printf("failed to open upload stream: %v", err)
			c.Status(500)
			return
		}
		if _, err := stream.Write(login_bytes); err != nil {
			stream.Close()
			l.Printf("failed to write to login upload stream: %v", err)
			c.Status(500)
			return
		}
		if err := stream.Close(); err != nil {
			l.Printf("failed to close login upload stream: %v", err)
			c.Status(500)
			return
		}

		// Upload user.profile file
		profileFileRef := primitive.NewObjectID()
		stream, err = filestore.Bucket.OpenUploadStreamWithID(profileFileRef, "")
		if err != nil {
			l.Printf("failed to open upload stream: %v", err)
			c.Status(500)
			return
		}
		if _, err := stream.Write(user_profile_bytes); err != nil {
			stream.Close()
			l.Printf("failed to write to profile upload stream: %v", err)
			c.Status(500)
			return
		}
		if err := stream.Close(); err != nil {
			l.Printf("failed to close profile upload stream: %v", err)
			c.Status(500)
			return
		}

		// Create home folder
		user_home, err := filestore.WriteDirectory(c.Request.Context(), home_folder.ID, req.Username, []string{"sysadmin"}, &home_permissions)
		if err != nil {
			l.Printf("failed to create user's home directory: %v", err)
			c.Status(500)
			return
		}

		if _, err := filestore.WriteFile(c.Request.Context(), user_home.ID, "user.profile", profileFileRef, user_tags); err != nil {
			l.Printf("failed to create user.profile file: %v", err)
			c.Status(500)
			return
		}

		if _, err := filestore.WriteFile(c.Request.Context(), passwd_folder.ID, req.Username+".login", loginFileRef, []string{"sysadmin"}); err != nil {
			l.Printf("failed to create passwd file: %v", err)
			c.Status(500)
			return
		}
		if _, err := filestore.RemoveChild(c.Request.Context(), passwd_folder.ID, req.TokStr+".signup", []string{"sysadmin"}); err != nil {
			l.Printf("failed to remove signup file: %v", err)
			c.Status(500)
			return
		}

		sessID, err := util.GenerateToken()
		if err != nil {
			l.Printf("failed to generate sessID: %v", err)
			c.Status(500)
			return
		}

		sessFileRef := primitive.NewObjectID()
		stream, err = filestore.Bucket.OpenUploadStreamWithID(sessFileRef, "")
		if err != nil {
			l.Printf("couldn't open upload stream for sess file: %v", err)
			c.Status(500)
			return
		}

		if _, err := stream.Write([]byte(req.Username)); err != nil {
			stream.Close()
			l.Printf("couldn't write username to bucket: %v", err)
			c.Status(500)
			return
		}
		if err := stream.Close(); err != nil {
			l.Printf("error closing sessFile upload stream: %v", err)
			c.Status(500)
			return
		}

		sessfolder, err := filestore.Lookup(c.Request.Context(), []string{"sysadmin"}, "/etc/sess")
		if err != nil {
			l.Printf("couldn't get sess folder: %v", err)
			c.Status(500)
			return
		}

		if _, err := filestore.WriteFile(c.Request.Context(), sessfolder.ID, sessID+".sess", sessFileRef, []string{"sysadmin"}); err != nil {
			l.Printf("couldn't write sess file: %v", err)
			c.Status(500)
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
