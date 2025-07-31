package types

import (
	"context"
	"errors"
	"io"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserImage struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	UserID    primitive.ObjectID `bson:"user"`
	FileID    primitive.ObjectID `bson:"file"`
	Filename  string             `bson:"filename"`
	Mimetype  string             `bson:"mimetype"`
	CreatedAt time.Time          `bson:"createdAt"`
}

var ErrUserImageNotExist = errors.New("User image does not exist")

type UserImageStore interface {
	UploadImage(userID, fileID primitive.ObjectID, filename, mimetype string, r io.Reader, ctx context.Context) (*UserImage, error)
	DownloadImageByID(ID primitive.ObjectID, ctx context.Context) (io.ReadCloser, *UserImage, error)
	GetImageMetaByID(ID primitive.ObjectID, ctx context.Context) (*UserImage, error)
}
