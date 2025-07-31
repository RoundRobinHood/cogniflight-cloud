package db

import (
	"context"
	"io"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
)

type DBUserImageStore struct {
	Col    *mongo.Collection
	Bucket *gridfs.Bucket
}

func (s DBUserImageStore) UploadImage(userID, fileID primitive.ObjectID, filename, mimetype string, r io.Reader, ctx context.Context) (*types.UserImage, error) {
	uploadStream, err := s.Bucket.OpenUploadStreamWithID(fileID, filename)
	if err != nil {
		return nil, err
	}
	defer uploadStream.Close()
	if _, err := io.Copy(uploadStream, r); err != nil {
		return nil, err
	}

	userImage := types.UserImage{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		FileID:    fileID,
		Filename:  filename,
		Mimetype:  mimetype,
		CreatedAt: time.Now(),
	}
	if _, err := s.Col.InsertOne(ctx, userImage); err != nil {
		return nil, err
	}

	return &userImage, nil
}

func (s DBUserImageStore) DownloadImageByID(ID primitive.ObjectID, ctx context.Context) (io.ReadCloser, *types.UserImage, error) {
	var ret types.UserImage
	if err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&ret); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil, types.ErrUserImageNotExist
		} else {
			return nil, nil, err
		}
	}

	if stream, err := s.Bucket.OpenDownloadStream(ret.FileID); err != nil {
		return nil, nil, err
	} else {
		return stream, &ret, nil
	}
}

func (s DBUserImageStore) GetImageMetaByID(ID primitive.ObjectID, ctx context.Context) (*types.UserImage, error) {
	var ret types.UserImage
	if err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&ret); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrUserImageNotExist
		} else {
			return nil, err
		}
	}

	return &ret, nil
}
