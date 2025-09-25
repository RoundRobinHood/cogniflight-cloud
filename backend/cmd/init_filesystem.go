package cmd

import (
	"context"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

func InitFileSystem(authStatus types.AuthorizationStatus) types.FsDirectory {
	root := filesystem.NewMemDirectory(types.FsNodePermissions{
		ReadTags:             []string{"atc", "sysadmin"},
		WriteTags:            []string{},
		ExecuteTags:          []string{"atc", "sysadmin"},
		UpdatePermissionTags: []string{},
	})

	userDir := filesystem.NewMemDirectory(types.FsNodePermissions{
		ReadTags:             []string{"atc", "sysadmin"},
		WriteTags:            []string{"atc", "sysadmin"},
		ExecuteTags:          []string{"atc", "sysadmin"},
		UpdatePermissionTags: []string{"atc", "sysadmin"},
	})
	userFile := filesystem.NewMemFile(types.FsNodePermissions{
		ReadTags:             []string{"atc", "sysadmin"},
		WriteTags:            []string{"atc", "sysadmin"},
		ExecuteTags:          []string{},
		UpdatePermissionTags: []string{"atc", "sysadmin"},
	}, []byte("Hello, atc!"))
	userDir.AddChild(context.Background(), nil, userFile, "test.txt")

	adminDir := filesystem.NewMemDirectory(types.FsNodePermissions{
		ReadTags:             []string{"sysadmin"},
		WriteTags:            []string{"sysadmin"},
		ExecuteTags:          []string{"sysadmin"},
		UpdatePermissionTags: []string{"sysadmin"},
	})
	adminFile := filesystem.NewMemFile(types.FsNodePermissions{
		ReadTags:             []string{"sysadmin"},
		WriteTags:            []string{"sysadmin"},
		ExecuteTags:          []string{},
		UpdatePermissionTags: []string{"sysadmin"},
	}, []byte("Hello, sysadmin!"))
	adminDir.AddChild(context.Background(), nil, adminFile, "test.txt")

	root.AddChild(context.Background(), nil, userDir, "atc")
	root.AddChild(context.Background(), nil, adminDir, "sysadmin")
	return root
}
