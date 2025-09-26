package types

import (
	"errors"
	"slices"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FsAccessMode int

const (
	ReadMode FsAccessMode = iota
	WriteMode
	ExecuteMode
	UpdatePermissionsMode
)

var ErrCantAccessFs = errors.New("error: cannot access file/directory (access denied)")

type FsEntryPermissions struct {
	ReadTags             []string `bson:"read_tags"`
	WriteTags            []string `bson:"write_tags"`
	ExecuteTags          []string `bson:"execute_tags"`
	UpdatePermissionTags []string `bson:"updatetag_tags"`
}

func (p FsEntryPermissions) IsAllowed(mode FsAccessMode, tags []string) bool {
	if tags == nil {
		return true
	}
	var check []string
	switch mode {
	case ReadMode:
		check = p.ReadTags
	case WriteMode:
		check = p.WriteTags
	case ExecuteMode:
		check = p.ExecuteTags
	case UpdatePermissionsMode:
		check = p.UpdatePermissionTags
	default:
		panic("invalid access mode")
	}

	for _, tag := range tags {
		if slices.Contains(check, tag) {
			return true
		}
	}
	return false
}

func (p FsEntryPermissions) CanUpdatePermTags(new_perms []string, user_tags []string) bool {
	if user_tags == nil {
		return true
	}

	// 1. User should have the permissions to update general tags
	if !p.IsAllowed(UpdatePermissionsMode, user_tags) {
		return false
	}

	// Fast lookup setup
	tag_map := map[string]struct{}{}
	new_tag_map := map[string]struct{}{}
	user_tag_map := map[string]struct{}{}
	for _, s := range p.UpdatePermissionTags {
		tag_map[s] = struct{}{}
	}
	for _, s := range new_perms {
		new_tag_map[s] = struct{}{}
	}
	for _, s := range user_tags {
		user_tag_map[s] = struct{}{}
	}

	// 2. User cannot add tags they do not own
	for s := range new_tag_map {
		if _, ok := tag_map[s]; !ok {
			if _, ok := user_tag_map[s]; !ok {
				return false
			}
		}
	}

	// 3. User cannot remove tags they do not own
	for s := range tag_map {
		if _, ok := new_tag_map[s]; !ok {
			if _, ok := user_tag_map[s]; !ok {
				return false
			}
		}
	}

	// 4. User cannot remove all their own tags (can't "lock" perm updates for themselves)
	for s := range user_tag_map {
		if _, ok := new_tag_map[s]; ok {
			return true
		}
	}
	return false
}

type FileTimestamps struct {
	CreatedAt  time.Time `bson:"created_at"`
	ModifiedAt time.Time `bson:"modified_at"`
	AccessedAt time.Time `bson:"accessed_at"`
}

type FsEntryReference struct {
	Name  string             `bson:"name"`
	RefID primitive.ObjectID `bson:"ref_id"`
}

type FsReferenceList []FsEntryReference

func (l FsReferenceList) Get(name string) (FsEntryReference, bool) {
	for _, entry := range l {
		if entry.Name == name {
			return entry, true
		}
	}

	return FsEntryReference{}, false
}

type FsEntryType int

const (
	File FsEntryType = iota
	Directory
)

type FsEntry struct {
	ID            primitive.ObjectID  `bson:"_id"`
	IsRoot        bool                `bson:"is_root,omitempty"`
	EntryType     FsEntryType         `bson:"type"`
	Permissions   FsEntryPermissions  `bson:"permissions"`
	Timestamps    FileTimestamps      `bson:"timestamps"`
	Entries       FsReferenceList     `bson:"entries,omitempty"`  // Represents a directory's contents as FsEntry references (including . and ..)
	FileReference *primitive.ObjectID `bson:"file_ref,omitempty"` // GridFS file reference (for files)
}
