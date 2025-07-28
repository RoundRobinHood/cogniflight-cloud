package keys

import (
	"errors"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CreateAPIKey(k types.APIKeyStore, n types.EdgeNodeStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)

		var req struct {
			EdgeID *primitive.ObjectID `json:"edgeNode" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if _, err := n.GetNodeByID(*req.EdgeID, c.Request.Context()); err != nil {
			if errors.Is(err, types.ErrNodeNotExist) {
				l.Printf("Edge node doesn't exist (ID: %s)", req.EdgeID.Hex())
				c.JSON(409, gin.H{"error": "Edge node does not exist"})
			} else {
				l.Printf("Failed to retrieve edge node: %v", err)
				c.JSON(500, gin.H{"error": "Internal error"})
			}
			return
		}

		if keyStr, keyObj, err := k.CreateKey(req.EdgeID, c.Request.Context()); err != nil {
			l.Printf("Failed to create key: %v", err)
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		} else {
			c.JSON(201, gin.H{"key": keyStr, "id": keyObj.ID})
		}
	}
}
