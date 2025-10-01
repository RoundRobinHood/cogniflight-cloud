package filesystem

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"mvdan.cc/sh/v3/interp"
)

func (s Store) OpenHandler(user_tags []string) interp.OpenHandlerFunc {
	var fun interp.OpenHandlerFunc
	fun = func(ctx context.Context, path string, flag int, perm os.FileMode) (io.ReadWriteCloser, error) {
		handlerContext := interp.HandlerCtx(ctx)
		abs_path, err := AbsPath(handlerContext.Dir, path)
		if err != nil {
			return nil, err
		}

		folder_path, filename, err := DirUp(abs_path)
		if err != nil {
			return nil, err
		}

		parent, err := s.Lookup(ctx, user_tags, folder_path)
		if err != nil {
			return nil, err
		}
		if parent.EntryType != types.Directory {
			return nil, fmt.Errorf("parent not a directory")
		}
		if !parent.Permissions.IsAllowed(types.ExecuteMode, user_tags) {
			return nil, types.ErrCantAccessFs
		}

		open_mode := flag & (os.O_RDONLY | os.O_WRONLY | os.O_RDWR)
		if open_mode == os.O_RDONLY {
			entryRef, ok := parent.Entries.Get(filename)
			if !ok {
				return nil, os.ErrNotExist
			}
			var entry types.FsEntry
			if err := s.Col.FindOne(ctx, bson.M{"_id": entryRef.RefID}).Decode(&entry); err != nil {
				if err == mongo.ErrNoDocuments {
					return nil, os.ErrNotExist
				} else {
					return nil, err
				}
			}

			if entry.FileReference == nil {
				return RdonlyFileStream{}, nil
			} else {
				stream, err := s.Bucket.OpenDownloadStream(entry.FileReference)
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
			stream, err := s.Bucket.OpenUploadStreamWithID(fileRef, "")

			if err != nil {
				return nil, err
			}

			if flag&os.O_APPEND != 0 && entryExists {
				var entry types.FsEntry
				if err := s.Col.FindOne(ctx, bson.M{"_id": entryRef.RefID}).Decode(&entry); err != nil {
					return nil, err
				}

				if entry.EntryType != types.File {
					return nil, fmt.Errorf("can't append text to a directory")
				}
				if entry.FileReference != nil {
					download, err := s.Bucket.OpenDownloadStream(entry.FileReference)
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
				Store:    s,
				FileName: filename,
				UserTags: user_tags,
			}, nil
		}

		// At this point, if O_RDWR isn't set, it's a bug
		if open_mode != os.O_RDWR {
			return nil, fmt.Errorf("%w: must specify O_RDONLY, O_WRONLY or O_RDWR", os.ErrInvalid)
		}

		readFlag := (flag&^os.O_RDWR | os.O_RDONLY)
		writeFlag := (flag&^os.O_RDWR | os.O_WRONLY)

		readStream, err := fun(ctx, path, readFlag, perm)
		if err != nil {
			return nil, err
		}
		writeStream, err := fun(ctx, path, writeFlag, perm)
		if err != nil {
			return nil, err
		}

		return &RdwrFileStream{
			ReadStream:  readStream,
			WriteStream: writeStream,
		}, nil
	}
	return fun
}

func (s Store) StatHandler(user_tags []string) interp.StatHandlerFunc {
	return func(ctx context.Context, path string, followSymlinks bool) (fs.FileInfo, error) {
		handlerContext := interp.HandlerCtx(ctx)
		abs_path, err := AbsPath(handlerContext.Dir, path)
		if err != nil {
			return nil, err
		}

		_, filename, err := DirUp(abs_path)
		if err != nil {
			return nil, err
		}

		entry, err := s.Lookup(ctx, user_tags, abs_path)
		if err != nil {
			return nil, err
		}

		size := int64(0)
		if entry.EntryType == types.File {
			if entry.FileReference != nil {
				var fileEntry struct {
					Length int64 `bson:"length"`
				}
				if err := s.Bucket.GetFilesCollection().FindOne(ctx, bson.M{"_id": entry.FileReference}).Decode(&fileEntry); err != nil {
					return nil, err
				}

				size = fileEntry.Length
			}
		}

		return types.FsStat{
			FileName:    filename,
			FileSize:    size,
			FileModTime: entry.Timestamps.ModifiedAt,
			FileIsDir:   entry.EntryType == types.Directory,
		}, nil
	}
}
