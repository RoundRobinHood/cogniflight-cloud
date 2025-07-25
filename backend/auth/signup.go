package auth

import (
	"os"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func CreateSignupToken(s types.SignupTokenStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		var req struct {
			Email     string           `json:"email"`
			Phone     string           `json:"phone"`
			Role      types.Role       `json:"role" binding:"required"`
			PilotInfo *types.PilotInfo `json:"pilotInfo"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if req.Role != types.RolePilot && req.PilotInfo != nil {
			c.JSON(400, gin.H{"error": "Cannot provide pilot info if the target role is not a pilot"})
			return
		}

		if req.Email == "" && req.Phone == "" {
			c.JSON(400, gin.H{"error": "Please provide either email, or phone"})
			return
		}

		tok, err := s.CreateSignupToken(req.Phone, req.Email, req.Role, req.PilotInfo, 6*time.Hour, c.Request.Context())
		if err != nil {
			c.JSON(500, gin.H{"error": "Internal error"})
			l.Printf("Error creating signup token: %v", err)
			return
		}

		c.JSON(201, gin.H{"tokStr": tok.TokStr})
	}
}

func Signup(u types.UserStore, s types.SignupTokenStore, sess types.SessionStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		var req struct {
			Name   string `json:"name" binding:"required"`
			Pwd    string `json:"pwd" binding:"required"`
			TokStr string `json:"tokStr" binding:"required"`
			Email  string `json:"email"`
			Phone  string `json:"phone"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
		}

		tok, err := s.GetSignupToken(req.TokStr, c.Request.Context())
		if err != nil {
			c.Status(401)
			return
		}

		hashed_pwd, err := util.HashPwd(req.Pwd)
		if err != nil {
			c.JSON(500, gin.H{"error": "Internal error"})
			l.Printf("Error occurred while hashing pwd: %v", err)
			return
		}
		user := types.User{
			Name:      req.Name,
			Email:     tok.Email,
			Phone:     tok.Phone,
			Pwd:       hashed_pwd,
			PilotInfo: tok.PilotInfo,
			Role:      tok.Role,
			CreatedAt: time.Now(),
		}
		if user.Email == "" {
			if req.Email == "" {
				c.JSON(400, gin.H{"error": "Email not provided."})
				return
			} else {
				user.Email = req.Email
			}
		}
		if user.Phone == "" {
			if req.Phone == "" {
				c.JSON(400, gin.H{"error": "Phone not provided"})
				return
			} else {
				user.Phone = req.Phone
			}
		}

		usr, err := u.CreateUser(user, c.Request.Context())
		if err != nil {
			c.JSON(500, gin.H{"error": "Internal error"})
			l.Printf("Error creating user: %v", err)
			return
		}

		session, err := sess.CreateSession(usr.ID, usr.Role, c.Request.Context())
		if err != nil {
			c.JSON(500, gin.H{"error": "Internal error"})
			l.Printf("Error creating session: %v", err)
			return
		}

		secure_session := false
		if os.Getenv("IS_HTTPS") == "TRUE" {
			secure_session = true
		}
		domain := os.Getenv("DOMAIN")

		c.SetCookie("sessid", session.SessID, 3600, "/", domain, secure_session, true)

		c.Status(201)
	}
}
