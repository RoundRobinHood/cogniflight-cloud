package pilot

import (
	"errors"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func FetchPilotByID(u types.UserStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)

		idStr, found := c.Params.Get("id")
		if !found {
			l.Printf("Handler set up without id param")
			c.JSON(500, gin.H{"error": "Internal error"})
		}

		ID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			l.Printf("ObjectIDFromHex failed: %v", err)
			c.JSON(400, gin.H{"error": "Invalid pilot ID"})
			return
		}

		if user, err := u.GetUserByID(ID, c.Request.Context()); err != nil {
			if errors.Is(err, types.ErrUserNotExist) {
				c.Status(404)
				return
			} else {
				l.Printf("Failed to get user: %v", err)
				c.JSON(500, gin.H{"error": "Internal error"})
				return
			}
		} else if user.Role != types.RolePilot {
			c.JSON(409, gin.H{"error": "ID is not a pilot"})
		} else {
			c.JSON(200, user)
		}
	}
}
