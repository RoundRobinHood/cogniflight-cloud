package filesystem

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type NodeMeta struct {
	nodeType types.FsNodeType

	types.FsNodePermissions

	mu sync.RWMutex
}

func (n *NodeMeta) NodeType() types.FsNodeType {
	n.mu.RLock()
	defer n.mu.RUnlock()

	return n.nodeType
}
func (n *NodeMeta) Permissions() types.FsNodePermissions {
	n.mu.RLock()
	defer n.mu.RUnlock()

	return n.FsNodePermissions
}
func (n *NodeMeta) SetPermissions(perms types.FsNodePermissions) {
	n.mu.Lock()
	defer n.mu.Unlock()

	n.FsNodePermissions = perms
}

type MemFile struct {
	NodeMeta
	Buffer []byte

	mu sync.RWMutex
}

type MemFileHandle struct {
	original_buffer []byte
	EditableBuffer

	memFile *MemFile
}

func (m *MemFileHandle) Sync(ctx context.Context) error {
	if m.EditableBuffer.closed {
		return os.ErrClosed
	}

	m.memFile.mu.Lock()
	defer m.memFile.mu.Unlock()

	if !bytes.Equal(m.original_buffer, m.memFile.Buffer) {
		return types.ErrSyncConflict
	}

	new_buf := make([]byte, len(m.EditableBuffer.buffer))
	copy(new_buf, m.EditableBuffer.buffer)
	m.memFile.Buffer = new_buf

	return nil
}

func (m *MemFile) GetHandle(tags []string) (types.FileHandle, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.Buffer == nil {
		m.Buffer = []byte{}
	}

	original_buf := make([]byte, len(m.Buffer))
	edit_buf := make([]byte, len(m.Buffer))
	copy(original_buf, m.Buffer)
	copy(edit_buf, m.Buffer)

	return &MemFileHandle{
		original_buffer: original_buf,
		EditableBuffer: EditableBuffer{
			buffer: edit_buf,
			perms:  m.FsNodePermissions,
			tags:   tags,
		},

		memFile: m,
	}, nil
}

func (m *MemFile) GetCommand(ctx context.Context, tags []string) (types.Command, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.IsAllowed(types.ExecuteMode, tags) {
		return nil, types.ErrCantAccessFs
	}

	return nil, fmt.Errorf("file execution not implemented")
}

func (m *MemFile) Desync(ctx context.Context, tags []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Buffer = nil
	return nil
}

// Assert interface implementation
var _ types.FileHandle = &MemFileHandle{}
var _ types.FsFile = &MemFile{}

func NewMemFile(perms types.FsNodePermissions, buffer []byte) *MemFile {
	return &MemFile{
		NodeMeta: NodeMeta{
			nodeType:          types.File,
			FsNodePermissions: perms,
		},
		Buffer: buffer,
	}
}

type MemDirectory struct {
	NodeMeta

	Children map[string]types.FsNode
	mu       sync.RWMutex
}

func (m *MemDirectory) Desync(ctx context.Context, tags []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.Children) != 0 {
		return fmt.Errorf("cannot desync directory: still has children")
	}

	m.Children = map[string]types.FsNode{}

	return nil
}

func (m *MemDirectory) List(ctx context.Context, tags []string) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if !m.Permissions().IsAllowed(types.ReadMode, tags) {
		return nil, types.ErrCantAccessFs
	}

	result := make([]string, 0, len(m.Children))
	for name := range m.Children {
		result = append(result, name)
	}

	return result, nil
}

func (m *MemDirectory) Lookup(ctx context.Context, tags []string, name string) (types.FsNode, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if !m.Permissions().IsAllowed(types.ExecuteMode, tags) {
		return nil, types.ErrCantAccessFs
	}

	if child, ok := m.Children[name]; ok {
		return child, nil
	} else {
		return nil, os.ErrNotExist
	}
}

func (m *MemDirectory) AddChild(ctx context.Context, tags []string, child types.FsNode, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.Permissions().IsAllowed(types.WriteMode, tags) {
		return types.ErrCantAccessFs
	}
	if !m.Permissions().IsAllowed(types.ExecuteMode, tags) {
		return types.ErrCantAccessFs
	}

	m.Children[name] = child
	return nil
}

func (m *MemDirectory) DeleteChild(ctx context.Context, tags []string, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.Permissions().IsAllowed(types.WriteMode, tags) {
		return types.ErrCantAccessFs
	}
	if !m.Permissions().IsAllowed(types.ExecuteMode, tags) {
		return types.ErrCantAccessFs
	}

	if child, ok := m.Children[name]; !ok {
		return os.ErrNotExist
	} else if err := child.Desync(ctx, tags); err != nil {
		return fmt.Errorf("couldn't desync child from store: %w", err)
	} else {
		delete(m.Children, name)
		return nil
	}
}

func (m *MemDirectory) UnlinkChild(ctx context.Context, tags []string, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.Permissions().IsAllowed(types.WriteMode, tags) {
		return types.ErrCantAccessFs
	}
	if !m.Permissions().IsAllowed(types.ExecuteMode, tags) {
		return types.ErrCantAccessFs
	}

	if _, ok := m.Children[name]; !ok {
		return os.ErrNotExist
	} else {
		delete(m.Children, name)
		return nil
	}
}

func (m *MemDirectory) RenameChild(ctx context.Context, tags []string, oldName, newName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.Permissions().IsAllowed(types.WriteMode, tags) {
		return types.ErrCantAccessFs
	}
	if !m.Permissions().IsAllowed(types.ExecuteMode, tags) {
		return types.ErrCantAccessFs
	}

	if _, ok := m.Children[oldName]; !ok {
		return os.ErrNotExist
	} else {
		if replace, ok := m.Children[newName]; ok {
			if err := replace.Desync(ctx, tags); err != nil {
				return fmt.Errorf("couldn't desync %s from store for overwrite: %w", newName, err)
			}
		}

		m.Children[newName] = m.Children[oldName]
		delete(m.Children, oldName)
		return nil
	}
}

// Assert MemDirectory's interface implementation
var _ types.FsDirectory = &MemDirectory{}

func NewMemDirectory(permissions types.FsNodePermissions) *MemDirectory {
	return &MemDirectory{
		NodeMeta: NodeMeta{
			nodeType:          types.Directory,
			FsNodePermissions: permissions,
		},
		Children: map[string]types.FsNode{},
	}
}
