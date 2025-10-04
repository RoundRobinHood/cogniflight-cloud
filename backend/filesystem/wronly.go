package filesystem

import (
	"context"
	"os"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
)

type WronlyFileStream struct {
	FileRef, ParentID primitive.ObjectID
	Stream            *gridfs.UploadStream
	Store             Store
	FileName          string
	UserTags          []string
}

func (w *WronlyFileStream) Read(p []byte) (int, error) {
	return 0, os.ErrInvalid
}

func (w *WronlyFileStream) Write(p []byte) (int, error) {
	return w.Stream.Write(p)
}

func (w *WronlyFileStream) Close() error {
	if err := w.Stream.Close(); err != nil {
		return err
	}

	if _, err := w.Store.WriteFile(context.Background(), w.ParentID, w.FileName, w.FileRef, w.UserTags); err != nil {
		return err
	}

	return nil
}
