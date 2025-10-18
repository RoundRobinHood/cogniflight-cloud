package filesystem

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
)

type Store struct {
	Col    *mongo.Collection
	Bucket *gridfs.Bucket
}

func (s Store) Lookup(ctx context.Context, tags []string, abs_path string) (*types.FsEntry, error) {
	now := time.Now()
	clean_path, err := CleanupAbsPath(abs_path)
	if err != nil {
		return nil, err
	}

	root := types.FsEntry{}
	if err := s.Col.FindOne(ctx, bson.M{
		"type":    types.Directory,
		"is_root": true,
	}).Decode(&root); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, os.ErrNotExist
		} else {
			return nil, err
		}
	}

	splits := strings.Split(clean_path[1:], "/")

	// Catch for "/" case
	if clean_path == "/" {
		return &root, nil
	}

	current := root
	for i, split := range splits {
		if !current.Permissions.IsAllowed(types.ExecuteMode, tags) {
			return nil, types.ErrCantAccessFs
		}

		var next types.FsEntry
		if reference, ok := current.Entries.Get(split); !ok {
			return nil, os.ErrNotExist
		} else if err := s.Col.FindOneAndUpdate(ctx, bson.M{"_id": reference.RefID}, bson.M{
			"$set": bson.M{
				"timestamps.accessed_at": now,
			},
		}).Decode(&next); err != nil {
			if err == mongo.ErrNoDocuments {
				return nil, os.ErrNotExist
			} else {
				return nil, err
			}
		} else if next.EntryType != types.Directory {
			if i == len(splits)-1 {
				return &next, nil
			} else {
				return nil, os.ErrNotExist
			}
		}
		current = next
	}
	return &current, nil
}

func (s Store) WriteFile(ctx context.Context, parentID primitive.ObjectID, name string, fileRef primitive.ObjectID, tags []string) (*types.FsEntry, error) {
	now := time.Now()

	parent := types.FsEntry{}
	if err := s.Col.FindOne(ctx, bson.M{"_id": parentID}).Decode(&parent); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, os.ErrNotExist
		} else {
			return nil, err
		}
	}

	if !parent.Permissions.IsAllowed(types.WriteMode, tags) || !parent.Permissions.IsAllowed(types.ExecuteMode, tags) {
		return nil, types.ErrCantAccessFs
	}
	if parent.EntryType != types.Directory {
		return nil, fmt.Errorf("parent is not a directory")
	}

	if reference, ok := parent.Entries.Get(name); ok {
		updated := types.FsEntry{}
		if err := s.Col.FindOneAndUpdate(ctx,
			bson.M{"_id": reference.RefID},
			bson.M{"$set": bson.M{
				"file_ref":               fileRef,
				"timestamps.modified_at": now,
				"timestamps.accessed_at": now,
			}}).Decode(&updated); err != nil {
			return nil, err
		} else {
			return &updated, nil
		}
	} else {
		created := types.FsEntry{
			ID:          primitive.NewObjectID(),
			EntryType:   types.File,
			Permissions: parent.Permissions,
			Timestamps: types.FileTimestamps{
				CreatedAt:  now,
				ModifiedAt: now,
				AccessedAt: now,
			},
			FileReference: &fileRef,
		}
		if _, err := s.Col.InsertOne(ctx, created); err != nil {
			return nil, err
		}

		if err := s.Col.FindOneAndUpdate(ctx, bson.M{"_id": parentID},
			bson.M{"$addToSet": bson.M{"entries": types.FsEntryReference{
				Name:  name,
				RefID: created.ID,
			}}}).Err(); err != nil {
			return nil, err
		} else {
			return &created, nil
		}
	}
}

func (s Store) ReadFile(ctx context.Context, ID primitive.ObjectID, tags []string) (io.ReadCloser, error) {
	file := types.FsEntry{}
	if err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&file); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, os.ErrNotExist
		} else {
			return nil, err
		}
	}

	return s.ReadFileObj(ctx, file, tags)
}

func (s Store) ReadFileObj(ctx context.Context, file types.FsEntry, tags []string) (io.ReadCloser, error) {
	if !file.Permissions.IsAllowed(types.ReadMode, tags) {
		return nil, types.ErrCantAccessFs
	}

	if file.FileReference == nil {
		return io.NopCloser(bytes.NewReader(nil)), nil
	}

	return s.Bucket.OpenDownloadStream(*file.FileReference)
}

func (s Store) LookupRead(ctx context.Context, abs_path string, tags []string) (io.ReadCloser, error) {
	if entry, err := s.Lookup(ctx, tags, abs_path); err != nil {
		return nil, err
	} else if !entry.Permissions.IsAllowed(types.ReadMode, tags) {
		return nil, types.ErrCantAccessFs
	} else if entry.EntryType != types.File {
		return nil, fmt.Errorf("error: read target is not a file")
	} else if entry.FileReference == nil {
		return io.NopCloser(bytes.NewReader(nil)), nil
	} else {
		return s.Bucket.OpenDownloadStream(*entry.FileReference)
	}
}

func (s Store) LookupReadAll(ctx context.Context, abs_path string, tags []string) ([]byte, error) {
	if reader, err := s.LookupRead(ctx, abs_path, tags); err != nil {
		return nil, err
	} else {
		defer reader.Close()
		return io.ReadAll(reader)
	}
}

func (s Store) WriteDirectory(ctx context.Context, parentID primitive.ObjectID, directoryName string, tags []string, dirTags *types.FsEntryPermissions) (*types.FsEntry, error) {
	now := time.Now()
	parent := types.FsEntry{}
	if err := s.Col.FindOne(ctx, bson.M{"_id": parentID}).Decode(&parent); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, os.ErrNotExist
		} else {
			return nil, err
		}
	}

	if !parent.Permissions.IsAllowed(types.WriteMode, tags) {
		return nil, types.ErrCantAccessFs
	}
	if parent.EntryType != types.Directory {
		return nil, fmt.Errorf("parent isn't a directory")
	}
	perms := parent.Permissions
	if dirTags != nil {
		if !parent.Permissions.CanUpdatePermTags(dirTags.UpdatePermissionTags, tags) {
			return nil, types.ErrCantAccessFs
		}
		perms = *dirTags
	}
	for _, entry := range parent.Entries {
		dir := types.FsEntry{}
		if entry.Name != directoryName {
			continue
		}
		if err := s.Col.FindOne(ctx, bson.M{"_id": entry.RefID}).Decode(&dir); err != nil {
			if err != mongo.ErrNoDocuments {
				return nil, err
			}
		} else {
			return &dir, nil
		}
	}

	created := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.Directory,
		Entries:   []types.FsEntryReference{},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		Permissions: perms,
	}

	if _, err := s.Col.InsertOne(ctx, created); err != nil {
		return nil, err
	}

	if err := s.Col.FindOneAndUpdate(ctx, bson.M{"_id": parentID},
		bson.M{"$addToSet": bson.M{"entries": types.FsEntryReference{
			Name:  directoryName,
			RefID: created.ID,
		}},
			"$set": bson.M{
				"timestamps.modified_at": now,
				"timestamps.accessed_at": now,
			}}).Err(); err != nil {
		return nil, err
	}

	return &created, nil
}

func (s Store) RemoveChild(ctx context.Context, parentID primitive.ObjectID, childName string, tags []string) (*types.FsEntry, error) {
	now := time.Now()
	parent := types.FsEntry{}
	if err := s.Col.FindOne(ctx, bson.M{"_id": parentID}).Decode(&parent); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, os.ErrNotExist
		} else {
			return nil, err
		}
	}

	if !parent.Permissions.IsAllowed(types.WriteMode, tags) {
		return nil, types.ErrCantAccessFs
	}
	if parent.EntryType != types.Directory {
		return nil, fmt.Errorf("parent isn't a directory")
	}

	if _, exists := parent.Entries.Get(childName); !exists {
		return nil, os.ErrNotExist
	}

	updated := types.FsEntry{}
	if err := s.Col.FindOneAndUpdate(ctx, bson.M{"_id": parentID},
		bson.M{"$pull": bson.M{"entries": bson.M{"name": childName}},
			"$set": bson.M{
				"timestamps.modified_at": now,
				"timestamps.accessed_at": now,
			}}).Decode(&updated); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, os.ErrNotExist
		} else {
			return nil, err
		}
	}

	return &updated, nil
}
