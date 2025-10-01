package filesystem

import (
	"io"
	"os"

	"go.mongodb.org/mongo-driver/mongo/gridfs"
)

type RdonlyFileStream struct {
	Stream *gridfs.DownloadStream
}

func (r RdonlyFileStream) Read(p []byte) (int, error) {
	if r.Stream == nil {
		return 0, io.EOF
	} else {
		return r.Stream.Read(p)
	}
}

func (r RdonlyFileStream) Write(p []byte) (int, error) {
	return 0, os.ErrInvalid
}

func (r RdonlyFileStream) Close() error {
	if r.Stream == nil {
		return nil
	} else {
		return r.Stream.Close()
	}
}
