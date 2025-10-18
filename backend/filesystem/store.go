package filesystem

import (
	"bytes"
	"context"
	"errors"
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

type ErrLookupStop struct {
	LastSuccessfulPath string
	LastEntry          types.FsEntry
	Reason             error
}

func (e ErrLookupStop) Error() string {
	return fmt.Sprintf("lookup stopped at %q: %v", e.LastSuccessfulPath, e.Reason)
}

func (e ErrLookupStop) Unwrap() error {
	return e.Reason
}

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
			return nil, ErrLookupStop{
				LastSuccessfulPath: "/" + strings.Join(splits[:i], "/"),
				LastEntry:          current,
				Reason:             fmt.Errorf("%w: %q", os.ErrNotExist, split),
			}
		} else if err := s.Col.FindOneAndUpdate(ctx, bson.M{"_id": reference.RefID}, bson.M{
			"$set": bson.M{
				"timestamps.accessed_at": now,
			},
		}).Decode(&next); err != nil {
			if err == mongo.ErrNoDocuments {
				return nil, ErrLookupStop{
					LastSuccessfulPath: "/" + strings.Join(splits[:i], "/"),
					LastEntry:          current,
					Reason:             fmt.Errorf("%w: %q", os.ErrNotExist, split),
				}
			} else {
				return nil, err
			}
		} else if next.EntryType != types.Directory {
			if i == len(splits)-1 {
				return &next, nil
			} else {
				return nil, ErrLookupStop{
					LastSuccessfulPath: "/" + strings.Join(splits[:i], "/"),
					LastEntry:          current,
					Reason:             fmt.Errorf("%w: %q is a file", os.ErrInvalid, split),
				}
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

func (s Store) Mkdir(ctx context.Context, abs_path string, tags []string, perms *types.FsEntryPermissions, mkParents bool) (*types.FsEntry, error) {

	clean_path, err := CleanupAbsPath(abs_path)
	if err != nil {
		return nil, err
	}
	folder_name, _, err := DirUp(abs_path)
	if err != nil {
		return nil, err
	}

	entry, err := s.Lookup(ctx, tags, clean_path)
	now := time.Now()
	if err != nil {
		var lookupStopError ErrLookupStop
		if errors.As(err, &lookupStopError) {
			if errors.Is(lookupStopError.Reason, os.ErrNotExist) {
				if lookupStopError.LastSuccessfulPath != folder_name && !mkParents {
					return nil, err
				} else {
					splits := strings.Split(strings.TrimPrefix(abs_path, lookupStopError.LastSuccessfulPath), "/")[1:]
					ids := make([]primitive.ObjectID, len(splits))
					for i := range splits {
						ids[i] = primitive.NewObjectID()
					}

					new_objects := make([]any, len(splits))
					for i := range splits {
						node := types.FsEntry{
							ID: ids[i],
							Timestamps: types.FileTimestamps{
								CreatedAt:  now,
								AccessedAt: now,
								ModifiedAt: now,
							},
							EntryType:   types.Directory,
							Permissions: lookupStopError.LastEntry.Permissions,
							Entries:     make(types.FsReferenceList, 0),
						}
						if i < len(splits)-1 {
							node.Entries = append(node.Entries, types.FsEntryReference{
								Name:  splits[i+1],
								RefID: ids[i+1],
							})
						} else if i == len(splits)-1 {
							if perms != nil {
								if !lookupStopError.LastEntry.Permissions.CanUpdatePermTags(perms.UpdatePermissionTags, tags) {
									return nil, types.ErrCantAccessFs
								}

								node.Permissions = *perms
							}
						}
						new_objects[i] = node
					}

					if _, err := s.Col.InsertMany(ctx, new_objects); err != nil {
						return nil, err
					}

					if _, err := s.Col.UpdateOne(ctx, bson.M{"_id": lookupStopError.LastEntry.ID}, bson.M{
						"$set": bson.M{
							"timestamps.accessed_at": now,
							"timestamps.modified_at": now,
						},
						"$addToSet": bson.M{
							"entries": types.FsEntryReference{
								Name:  splits[0],
								RefID: new_objects[0].(types.FsEntry).ID,
							},
						},
					}); err != nil {
						return nil, err
					}

					folder := new_objects[len(new_objects)-1].(types.FsEntry)
					return &folder, nil
				}
			} else {
				return nil, err
			}
		} else {
			return nil, err
		}
	} else {
		return entry, os.ErrExist
	}
}

func (s Store) RemoveFile(ctx context.Context, abs_path string, tags []string, force, rmDirectories bool) (*types.FsEntry, error) {
	folder_name, filename, err := DirUp(abs_path)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	parent, err := s.Lookup(ctx, tags, folder_name)
	if err != nil {
		return nil, err
	}
	if parent.EntryType != types.Directory {
		return nil, fmt.Errorf("%w: parent not a directory", os.ErrInvalid)
	}
	if !parent.Permissions.IsAllowed(types.WriteMode, tags) {
		if !force || !parent.Permissions.IsAllowed(types.UpdatePermissionsMode, tags) {
			return nil, types.ErrCantAccessFs
		}
	}

	if entryReference, exists := parent.Entries.Get(filename); !exists {
		return nil, os.ErrNotExist
	} else {
		var entry types.FsEntry
		if err := s.Col.FindOne(ctx, bson.M{"_id": entryReference.RefID}).Decode(&entry); err != nil {
			return nil, err
		}
		if entry.EntryType == types.Directory && !rmDirectories {
			return nil, fmt.Errorf("%w: file is a directory", os.ErrInvalid)
		}
		if _, err := s.Col.DeleteOne(ctx, bson.M{"_id": entry.ID}); err != nil {
			return nil, err
		}

		if err := s.Col.FindOneAndUpdate(ctx, bson.M{"_id": parent.ID}, bson.M{
			"$set": bson.M{
				"timestamps.modified_at": now,
				"timestamps.accessed_at": now,
			},
			"$pull": bson.M{
				"entries": bson.M{
					"name": filename,
				},
			},
		}).Err(); err != nil {
			return nil, err
		}
		return &entry, nil
	}
}

func (s Store) Move(ctx context.Context, dest_path, src_path string, tags []string) (*types.FsEntryReference, error) {
	now := time.Now()
	source_folder_path, source_filename, err := DirUp(src_path)
	if err != nil {
		return nil, err
	}

	dest_abs, err := CleanupAbsPath(dest_path)
	if err != nil {
		return nil, err
	}

	source_folder, err := s.Lookup(ctx, tags, source_folder_path)
	if err != nil {
		return nil, err
	}

	if !source_folder.Permissions.IsAllowed(types.ReadMode, tags) {
		return nil, types.ErrCantAccessFs
	}

	if entry, ok := source_folder.Entries.Get(source_filename); !ok {
		return nil, os.ErrNotExist
	} else {
		dest_folder, err := s.Lookup(ctx, tags, dest_abs)
		if err != nil {
			var lookupStopError ErrLookupStop
			if errors.As(err, &lookupStopError) && errors.Is(err, os.ErrNotExist) {
				dest_parent_path, dest_filename, _ := DirUp(dest_abs)
				if lookupStopError.LastSuccessfulPath != dest_parent_path {
					return nil, err
				}

				if !lookupStopError.LastEntry.Permissions.IsAllowed(types.WriteMode, tags) {
					return nil, types.ErrCantAccessFs
				}

				if _, err := s.Col.UpdateOne(ctx, bson.M{"_id": lookupStopError.LastEntry.ID}, bson.M{
					"$set": bson.M{
						"timestamps.accessed_at": now,
						"timestamps.modified_at": now,
					},
					"$pull": bson.M{"entries": bson.M{"name": dest_filename}},
				}); err != nil {
					return nil, err
				}

				if _, err := s.Col.UpdateByID(ctx, lookupStopError.LastEntry.ID, bson.M{
					"$push": bson.M{"entries": types.FsEntryReference{
						Name:  dest_filename,
						RefID: entry.RefID,
					}},
				}); err != nil {
					return nil, err
				}

				if _, err := s.Col.UpdateOne(ctx, bson.M{"_id": source_folder.ID}, bson.M{
					"$set": bson.M{
						"timestamps.accessed_at": now,
						"timestamps.modified_at": now,
					},
					"$pull": bson.M{"entries": bson.M{"name": source_filename}},
				}); err != nil {
					return nil, err
				}

				return &entry, nil
			} else {
				return nil, err
			}
		} else {
			if !dest_folder.Permissions.IsAllowed(types.WriteMode, tags) {
				return nil, types.ErrCantAccessFs
			}

			if _, err := s.Col.UpdateOne(ctx, bson.M{"_id": dest_folder.ID}, bson.M{
				"$set": bson.M{
					"timestamps.accessed_at": now,
					"timestamps.modified_at": now,
				},
				"$pull": bson.M{"entries": bson.M{"name": source_filename}},
			}); err != nil {
				return nil, err
			}

			if _, err := s.Col.UpdateByID(ctx, dest_folder.ID, bson.M{
				"$push": bson.M{"entries": types.FsEntryReference{
					Name:  source_filename,
					RefID: entry.RefID,
				}},
			}); err != nil {
				return nil, err
			}

			if _, err := s.Col.UpdateByID(ctx, source_folder.ID, bson.M{
				"$set": bson.M{
					"timestamps.accessed_at": now,
					"timestamps.modified_at": now,
				},
				"$pull": bson.M{"entries": bson.M{"name": source_filename}},
			}); err != nil {
				return nil, err
			}

			return &entry, nil
		}
	}
}
