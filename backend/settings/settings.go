package settings

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func Settings(u types.UserStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		sess_get, ok := c.Get("sess")
		if !ok {
			l.Printf("No auth middleware")
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		}
		sess := sess_get.(*types.Session)

		var update types.UserUpdate
		if err := c.ShouldBindJSON(&update); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if update.Role != "" {
			c.JSON(403, gin.H{"error": "Not allowed to change own role in settings."})
			return
		}

		if update.PilotInfo.Provided && sess.Role != types.RolePilot {
			c.JSON(400, gin.H{"error": "Only pilots can change pilotInfo"})
			return
		}

		user, err := u.UpdateUser(sess.UserID, update, c.Request.Context())
		if err != nil {
			l.Printf("User update failed: %v", err)
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		}

		c.JSON(200, types.UserInfo{
			ID:        user.ID,
			Name:      user.Name,
			Email:     user.Email,
			Phone:     user.Phone,
			Role:      user.Role,
			PilotInfo: user.PilotInfo,
		})
	}
}
