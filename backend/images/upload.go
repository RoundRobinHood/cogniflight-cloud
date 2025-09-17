package images

import (
	"bytes"
	"io"
	"mime"
	"net/http"
	"path/filepath"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/db"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func UploadImage(i types.UserImageStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		l := jlogging.MustGet(c)
		sess_get, ok := c.Get("sess")
		if !ok {
			l.Printf("No auth middleware")
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		}

		sess := sess_get.(*types.Session)
		fileHeader, err := c.FormFile("image")
		if err != nil {
			c.JSON(400, gin.H{"error": "expected image field"})
			return
		}

		src, err := fileHeader.Open()
		if err != nil {
			c.JSON(500, gin.H{"error": "Could not read file"})
			return
		}
		defer src.Close()

		head := make([]byte, 512)
		n, err := io.ReadFull(src, head)
		if err != nil && err != io.ErrUnexpectedEOF {
			l.Printf("Failed to read head from file: %v", err)
			c.JSON(500, gin.H{"error": "Internal error"})
			return
		}

		mimetype := http.DetectContentType(head[:n])
		if mimetype == "application/octet-stream" {
			mimetype = mime.TypeByExtension(filepath.Ext(fileHeader.Filename))
		}

		reader := io.MultiReader(bytes.NewReader(head[:n]), src)
		img, err := i.UploadImage(sess.UserID, primitive.NewObjectID(), fileHeader.Filename, mimetype, reader, c.Request.Context())
		if err != nil {
			if db.IsValidationError(err) {
				l.Set("err", err)
				c.JSON(400, gin.H{"error": err.Error()})
			} else {
				l.Printf("Failed to upload image: %v", err)
				c.JSON(500, gin.H{"error": "Internal error"})
			}
			return
		}

		c.JSON(201, gin.H{"id": img.ID})
	}
}
