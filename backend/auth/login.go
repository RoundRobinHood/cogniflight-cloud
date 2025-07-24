package auth

import (
	"crypto/rand"
	"encoding/base64"
	"os"

	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
	"golang.org/x/crypto/bcrypt"
)

func GenerateToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func HashPwd(pwd string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func CheckPwd(hashedPwd, plainPwd string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPwd), []byte(plainPwd))
	return err == nil
}

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

		if CheckPwd(user.Pwd, req.Pwd) {
			secure_session := false
			if os.Getenv("IS_HTTPS") == "TRUE" {
				secure_session = true
			}
			domain := os.Getenv("DOMAIN")

			c.Status(200)
			sess, _ := s.CreateSession(user.ID, user.Role, c.Request.Context())
			c.SetCookie("sessid", sess.SessID, 3600, "/", domain, secure_session, true)
		} else {
			c.Status(401)
		}
	}
}
