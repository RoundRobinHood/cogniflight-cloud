package filesystem

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/sh"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type FSContext struct {
	Store    Store
	UserTags []string
}

func (c *FSContext) Stat(ctx context.Context, path string) (sh.FileInfo, error) {
	log.Printf("Stat %s\n", path)
	var zero sh.FileInfo
	if node, err := c.Store.Lookup(ctx, c.UserTags, path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return zero, nil
		} else {
			return zero, err
		}
	} else {
		executable := node.Permissions.IsAllowed(types.ExecuteMode, c.UserTags)
		readable := node.Permissions.IsAllowed(types.ReadMode, c.UserTags)
		writeable := node.Permissions.IsAllowed(types.WriteMode, c.UserTags)
		switch node.EntryType {
		case types.File:
			return sh.FileInfo{
				Type:       sh.FileRegular,
				Executable: executable,
				Readable:   readable,
				Writable:   writeable,
			}, nil
		case types.Directory:
			return sh.FileInfo{
				Type:       sh.FileDir,
				Executable: executable,
				Readable:   readable,
				Writable:   writeable,
			}, nil
		default:
			return zero, fmt.Errorf("invalid EntryType: %v", node.EntryType)
		}
	}
}

func (c *FSContext) Open(ctx context.Context, path string, flag int, perm os.FileMode) (io.ReadWriteCloser, error) {
	folder_path, filename, err := DirUp(path)
	if err != nil {
		return nil, err
	}

	parent, err := c.Store.Lookup(ctx, c.UserTags, folder_path)
	if err != nil {
		return nil, err
	}
	if parent.EntryType != types.Directory {
		return nil, fmt.Errorf("%w: parent not a directory", os.ErrInvalid)
	}
	if !parent.Permissions.IsAllowed(types.ExecuteMode, c.UserTags) {
		return nil, types.ErrCantAccessFs
	}

	open_mode := flag & (os.O_RDONLY | os.O_WRONLY | os.O_RDWR)
	if open_mode == os.O_RDONLY {
		entryRef, ok := parent.Entries.Get(filename)
		if !ok {
			return nil, os.ErrNotExist
		}
		var entry types.FsEntry
		if err := c.Store.Col.FindOne(ctx, bson.M{"_id": entryRef.RefID}).Decode(&entry); err != nil {
			if err == mongo.ErrNoDocuments {
				return nil, os.ErrNotExist
			} else {
				return nil, err
			}
		}

		if !entry.Permissions.IsAllowed(types.ReadMode, c.UserTags) {
			return nil, types.ErrCantAccessFs
		}

		if entry.FileReference == nil {
			return RdonlyFileStream{}, nil
		} else {
			stream, err := c.Store.Bucket.OpenDownloadStream(entry.FileReference)
			if err != nil {
				return nil, err
			} else {
				return RdonlyFileStream{stream}, nil
			}
		}
	}

	if open_mode == os.O_WRONLY {
		entryRef, entryExists := parent.Entries.Get(filename)
		if flag&os.O_CREATE == 0 && !entryExists {
			return nil, os.ErrNotExist
		}
		if flag&os.O_EXCL != 0 && entryExists {
			return nil, os.ErrExist
		}

		fileRef := primitive.NewObjectID()
		stream, err := c.Store.Bucket.OpenUploadStreamWithID(fileRef, "")

		if err != nil {
			return nil, err
		}

		if flag&os.O_APPEND != 0 && entryExists {
			var entry types.FsEntry
			if err := c.Store.Col.FindOne(ctx, bson.M{"_id": entryRef.RefID}).Decode(&entry); err != nil {
				return nil, err
			}

			if !entry.Permissions.IsAllowed(types.WriteMode, c.UserTags) {
				return nil, types.ErrCantAccessFs
			}

			if entry.EntryType != types.File {
				return nil, fmt.Errorf("can't append text to a directory")
			}
			if entry.FileReference != nil {
				download, err := c.Store.Bucket.OpenDownloadStream(entry.FileReference)
				if err != nil {
					return nil, err
				}

				if _, err := io.Copy(stream, download); err != nil {
					download.Close()
					return nil, err
				}

				if err := download.Close(); err != nil {
					return nil, err
				}
			}
		}

		return &WronlyFileStream{
			FileRef:  fileRef,
			ParentID: parent.ID,
			Stream:   stream,
			Store:    c.Store,
			FileName: filename,
			UserTags: c.UserTags,
		}, nil
	}

	// At this point, if O_RDWR isn't set, it's a bug
	if open_mode != os.O_RDWR {
		return nil, fmt.Errorf("%w: must specify O_RDONLY, O_WRONLY or O_RDWR", os.ErrInvalid)
	}

	readFlag := (flag&^os.O_RDWR | os.O_RDONLY)
	writeFlag := (flag&^os.O_RDWR | os.O_WRONLY)

	readStream, err := c.Open(ctx, path, readFlag, perm)
	if err != nil {
		return nil, err
	}
	writeStream, err := c.Open(ctx, path, writeFlag, perm)
	if err != nil {
		return nil, err
	}

	return &RdwrFileStream{
		ReadStream:  readStream,
		WriteStream: writeStream,
	}, nil
}
