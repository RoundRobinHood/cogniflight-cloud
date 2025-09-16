package crud

import (
	"fmt"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/auth"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func List[Output, Filter any](listable types.Listable[Output, Filter], defaultPageSize int) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		status := auth.CheckAuthStatus(c)
		var filter Filter
		if err := c.ShouldBindQuery(&filter); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		page, pageSize := 1, defaultPageSize

		if pageStr, provided := c.GetQuery("page"); provided {
			if _, err := fmt.Sscan(pageStr, &page); err != nil {
				c.JSON(400, gin.H{"error": fmt.Sprintf("Invalid page number str: %s", pageStr)})
				return
			}

			if page <= 0 {
				c.JSON(400, gin.H{"error": "Page must be > 0"})
				return
			}
		}

		if pageSizeStr, provided := c.GetQuery("pagesize"); provided {
			if _, err := fmt.Sscan(pageSizeStr, &pageSize); err != nil {
				c.JSON(400, gin.H{"error": fmt.Sprintf("Invalid page size str: %s", pageSizeStr)})
				return
			}

			if pageSize < 0 {
				c.JSON(400, gin.H{"error": "Page size must be at least 0"})
				return
			}
		}

		output, err := listable.List(types.ListOptions[Filter]{
			Page:     page,
			PageSize: pageSize,
			Filter:   filter,
		}, status, c.Request.Context())

		if err != nil {
			l.Set("err", err.Err)
			if err.ErrorCode >= 500 && err.ErrorCode < 600 {
				c.JSON(err.ErrorCode, gin.H{"error": "Internal error"})
			} else {
				c.JSON(err.ErrorCode, gin.H{"error": err.Err.Error()})
			}
			return
		} else {
			c.JSON(200, output)
		}
	}
}

func Get[Output any](gettable types.IDGettable[Output], param_name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		status := auth.CheckAuthStatus(c)
		idStr := c.Param(param_name)
		ID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid ObjectID"})
			return
		}

		if output, err := gettable.GetItem(ID, status, c.Request.Context()); err != nil {
			l.Set("err", err.Err)
			if err.ErrorCode >= 500 && err.ErrorCode < 600 {
				c.JSON(err.ErrorCode, gin.H{"error": "Internal error"})
			} else {
				c.JSON(err.ErrorCode, gin.H{"error": err.Err.Error()})
			}
			return
		} else {
			c.JSON(200, output)
		}
	}
}

func Create[Input, Output any](creatable types.Creatable[Input, Output]) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		status := auth.CheckAuthStatus(c)
		var input Input
		if err := c.BindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if output, err := creatable.Create(input, status, c.Request.Context()); err != nil {
			l.Set("err", err.Err)
			if err.ErrorCode >= 500 && err.ErrorCode < 600 {
				c.JSON(err.ErrorCode, gin.H{"error": "Internal error"})
			} else {
				c.JSON(err.ErrorCode, gin.H{"error": err.Err.Error()})
			}
			return
		} else {
			c.JSON(200, output)
		}
	}
}

func Update[Update, Output any](updatable types.IDUpdatable[Update, Output], param_name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		status := auth.CheckAuthStatus(c)

		idStr := c.Param(param_name)
		ID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid ObjectID"})
			return
		}

		var update Update
		if err := c.ShouldBindJSON(&update); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if output, err := updatable.Update(ID, status, update, c.Request.Context()); err != nil {
			l.Set("err", err.Err)
			if err.ErrorCode >= 500 && err.ErrorCode < 600 {
				c.JSON(err.ErrorCode, gin.H{"error": "Internal error"})
			} else {
				c.JSON(err.ErrorCode, gin.H{"error": err.Err.Error()})
			}
			return
		} else {
			c.JSON(200, output)
		}
	}
}

func Delete[Output any](deleteable types.IDDeleteable[Output], param_name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		status := auth.CheckAuthStatus(c)

		idStr := c.Param(param_name)
		ID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid ObjectID"})
			return
		}

		if output, err := deleteable.Delete(ID, status, c.Request.Context()); err != nil {
			l.Set("err", err.Err)
			if err.ErrorCode >= 500 && err.ErrorCode < 600 {
				c.JSON(err.ErrorCode, gin.H{"error": "Internal error"})
			} else {
				c.JSON(err.ErrorCode, gin.H{"error": err.Err.Error()})
			}
			return
		} else {
			c.JSON(200, output)
		}
	}
}

func RegisterEndpoints[Input, UpdateType, Output, Filter any](rg *gin.RouterGroup, repository types.Repository[Input, UpdateType, Output, Filter], defaultPageSize int) {
	rg.GET("", List(repository, defaultPageSize))
	rg.GET(":id", Get(repository, "id"))
	rg.POST("", Create(repository))
	rg.PATCH(":id", Update(repository, "id"))
}
