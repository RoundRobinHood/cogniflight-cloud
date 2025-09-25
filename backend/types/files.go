package types

import (
	"context"
	"errors"
	"io"
	"slices"
)

type FsAccessMode int

const (
	ReadMode FsAccessMode = iota
	WriteMode
	ExecuteMode
	UpdatePermissionsMode
)

var ErrCantAccessFs = errors.New("error: cannot access file/directory (access denied)")

type FsNodePermissions struct {
	ReadTags, WriteTags, ExecuteTags, UpdatePermissionTags []string
}

func (p FsNodePermissions) IsAllowed(mode FsAccessMode, tags []string) bool {
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

func (p FsNodePermissions) CanUpdatePermTags(new_perms []string, user_tags []string) bool {
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

type FsNodeType int

const (
	File FsNodeType = iota
	Directory
)

type FsNode interface {
	NodeType() FsNodeType

	Permissions() FsNodePermissions
	SetPermissions(perms FsNodePermissions)

	Desync(ctx context.Context, tags []string) error // Desync un-syncs the current node from the backing store
}

var ErrSyncConflict = errors.New("error: could not sync file due to conflicts")

type ValidationErr struct {
	ValidationMsg string
}

func (v ValidationErr) Error() string {
	return v.ValidationMsg
}

// FileHandle starts returning os.ErrNotExist when it notices the file source no longer exists
type FileHandle interface {
	io.ReadWriteSeeker
	io.Closer
	io.WriterTo
	io.ReaderFrom
	Truncate(newSize int64) error
	Size() int64

	Sync(ctx context.Context) error
}

// NOTE: about passing tags to functions
// if tag arrays are nil, the function should proceed without access control (meant for system-level operations, like initializing the file system. For high-privelege ops, use "root")
// If implementations are returning access errors, `errors.Is(err, types.ErrCantAccessFs)` will be true.
// Additionally, GetHandle from FsFile and Lookup from FsDirectory should enforce access control according to the executable tags on directories

// FsFile represents an editable buffer, that is potentially executable (if there's time, it will basically be a bash DSL)
type FsFile interface {
	FsNode

	GetHandle(tags []string) (FileHandle, error)                    // GetHandle should do no long-running ops (that's why ctx is in the handle definitions instead)
	GetCommand(ctx context.Context, tags []string) (Command, error) // TODO: parsing error types for Command parsing (theoretically)
}

// FsDirectory represents a named, queriable list of nodes, that can also be added to or removed from
type FsDirectory interface {
	FsNode

	List(ctx context.Context, tags []string) ([]string, error)
	Lookup(ctx context.Context, tags []string, name string) (FsNode, error) // also os.ErrNotExist when looking for non-existent files

	AddChild(ctx context.Context, tags []string, child FsNode, name string) error
	DeleteChild(ctx context.Context, tags []string, name string) error // DeleteChild removes the current child from the tree and desyncs it its backing store
	UnlinkChild(ctx context.Context, tags []string, name string) error // UnlinkChild removes the directory's reference to the child (without de-syncing it)
	RenameChild(ctx context.Context, tags []string, oldName, newName string) error
}
