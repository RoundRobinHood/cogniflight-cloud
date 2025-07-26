package edge

import (
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func CreateEdgeNode(n types.EdgeNodeStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		var req struct {
			PlaneInfo *types.PlaneInfo `binding:"required" json:"planeInfo"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		node, err := n.CreateEdgeNode(*req.PlaneInfo, c.Request.Context())
		if err != nil {
			l.Printf("Failed to create edge node: %v", err)
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		}

		c.JSON(201, node)
	}
}
