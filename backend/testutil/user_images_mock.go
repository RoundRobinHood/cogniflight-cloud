package testutil

import (
	"bytes"
	"context"
	"io"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FakeUserImageStore struct {
	Images map[primitive.ObjectID]types.UserImage
	Bytes  map[primitive.ObjectID][]byte
}

func (s *FakeUserImageStore) UploadImage(userID, fileID primitive.ObjectID, filename, mimetype string, r io.Reader, ctx context.Context) (*types.UserImage, error) {
	if s.Images == nil {
		s.Images = map[primitive.ObjectID]types.UserImage{}
	}
	if s.Bytes == nil {
		s.Bytes = map[primitive.ObjectID][]byte{}
	}

	bytes, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	ID := primitive.NewObjectID()
	userImage := types.UserImage{
		ID:        ID,
		UserID:    userID,
		FileID:    fileID,
		Filename:  filename,
		Mimetype:  mimetype,
		CreatedAt: time.Now(),
	}
	s.Images[ID] = userImage
	s.Bytes[ID] = bytes

	return &userImage, nil
}

func (s *FakeUserImageStore) DownloadImageByID(ID primitive.ObjectID, ctx context.Context) (io.ReadCloser, *types.UserImage, error) {
	if s.Images == nil {
		s.Images = map[primitive.ObjectID]types.UserImage{}
	}
	if s.Bytes == nil {
		s.Bytes = map[primitive.ObjectID][]byte{}
	}

	if userImage, ok := s.Images[ID]; !ok {
		return nil, nil, types.ErrUserImageNotExist
	} else {
		return io.NopCloser(bytes.NewReader(s.Bytes[ID])), &userImage, nil
	}
}

func (s *FakeUserImageStore) GetImageMetaByID(ID primitive.ObjectID, ctx context.Context) (*types.UserImage, error) {
	if s.Images == nil {
		s.Images = map[primitive.ObjectID]types.UserImage{}
	}
	if s.Bytes == nil {
		s.Bytes = map[primitive.ObjectID][]byte{}
	}

	if userImage, ok := s.Images[ID]; ok {
		return &userImage, nil
	} else {
		return nil, types.ErrUserImageNotExist
	}
}
