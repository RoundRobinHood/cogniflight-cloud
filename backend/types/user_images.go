package types

import (
	"context"
	"errors"
	"io"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserImage struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	UserID    primitive.ObjectID `bson:"user" json:"user"`
	FileID    primitive.ObjectID `bson:"file" json:"file"`
	Filename  string             `bson:"filename" json:"filename"`
	Mimetype  string             `bson:"mimetype" json:"mimetype"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

var ErrUserImageNotExist = errors.New("User image does not exist")

type UserImageStore interface {
	UploadImage(userID, fileID primitive.ObjectID, filename, mimetype string, r io.Reader, ctx context.Context) (*UserImage, error)
	DownloadImageByID(ID primitive.ObjectID, ctx context.Context) (io.ReadCloser, *UserImage, error)
	GetImageMetaByID(ID primitive.ObjectID, ctx context.Context) (*UserImage, error)
}
