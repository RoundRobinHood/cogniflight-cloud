package main

import (
	"context"
	"fmt"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func InitFilesystem(fileStore filesystem.Store, username, email, phone, pwd string) error {
	hashed_pwd, err := util.HashPwd(pwd)
	if err != nil {
		return err
	}

	user_tags := []string{"sysadmin", "user-" + username, "user"}
	passwd_bytes, err := util.YamlCRLF(types.CredentialsEntry{
		Password: hashed_pwd,
		Tags:     user_tags,
	})
	if err != nil {
		return err
	}

	passwd_fileRef := primitive.NewObjectID()
	{
		stream, err := fileStore.Bucket.OpenUploadStreamWithID(passwd_fileRef, "")
		if err != nil {
			return err
		}
		if _, err := stream.Write(passwd_bytes); err != nil {
			stream.Close()
			return err
		}
		stream.Close()
	}

	now := time.Now()
	passwd_file := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.File,
		Permissions: types.FsEntryPermissions{
			WriteTags:            []string{"sysadmin"},
			ReadTags:             []string{"sysadmin"},
			ExecuteTags:          []string{"sysadmin"},
			UpdatePermissionTags: []string{"sysadmin"},
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		FileReference: &passwd_fileRef,
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), passwd_file); err != nil {
		return err
	}

	passwd_folder := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.Directory,
		Permissions: types.FsEntryPermissions{
			WriteTags:            []string{"sysadmin"},
			ReadTags:             []string{"sysadmin"},
			ExecuteTags:          []string{"sysadmin"},
			UpdatePermissionTags: []string{"sysadmin"},
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		Entries: []types.FsEntryReference{
			{
				Name:  fmt.Sprintf("%s.login", username),
				RefID: passwd_file.ID,
			},
		},
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), passwd_folder); err != nil {
		return err
	}

	sess_folder := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.Directory,
		Permissions: types.FsEntryPermissions{
			WriteTags:            []string{"sysadmin"},
			ReadTags:             []string{"sysadmin"},
			ExecuteTags:          []string{"sysadmin"},
			UpdatePermissionTags: []string{"sysadmin"},
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		Entries: []types.FsEntryReference{},
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), sess_folder); err != nil {
		return err
	}

	etc_folder := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.Directory,
		Permissions: types.FsEntryPermissions{
			WriteTags:            []string{"sysadmin"},
			ReadTags:             []string{"sysadmin"},
			ExecuteTags:          []string{"sysadmin"},
			UpdatePermissionTags: []string{"sysadmin"},
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		Entries: []types.FsEntryReference{
			{
				Name:  "passwd",
				RefID: passwd_folder.ID,
			},
			{
				Name:  "sess",
				RefID: sess_folder.ID,
			},
		},
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), etc_folder); err != nil {
		return err
	}

	metafile_bytes, err := util.YamlCRLF(types.UserMetadata{
		Email: email,
		Phone: phone,
		Role:  "sysadmin",
	})
	if err != nil {
		return err
	}
	metafileRef := primitive.NewObjectID()
	{
		stream, err := fileStore.Bucket.OpenUploadStreamWithID(metafileRef, "")
		if err != nil {
			return err
		}

		if _, err := stream.Write(metafile_bytes); err != nil {
			stream.Close()
			return err
		}
		if err := stream.Close(); err != nil {
			stream.Close()
			return err
		}

		stream.Close()
	}

	metafile := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.File,
		Permissions: types.FsEntryPermissions{
			WriteTags:            user_tags,
			ReadTags:             user_tags,
			ExecuteTags:          user_tags,
			UpdatePermissionTags: user_tags,
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		FileReference: &metafileRef,
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), metafile); err != nil {
		return err
	}

	user_home := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.Directory,
		Permissions: types.FsEntryPermissions{
			WriteTags:            user_tags,
			ReadTags:             user_tags,
			ExecuteTags:          user_tags,
			UpdatePermissionTags: user_tags,
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		Entries: []types.FsEntryReference{{
			Name:  "user.profile",
			RefID: metafile.ID,
		}},
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), user_home); err != nil {
		return err
	}

	home_folder := types.FsEntry{
		ID:        primitive.NewObjectID(),
		EntryType: types.Directory,
		Permissions: types.FsEntryPermissions{
			WriteTags:            []string{"sysadmin"},
			ReadTags:             []string{"sysadmin"},
			ExecuteTags:          []string{"sysadmin", "user"},
			UpdatePermissionTags: []string{"sysadmin"},
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		Entries: []types.FsEntryReference{{
			Name:  username,
			RefID: user_home.ID,
		}},
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), home_folder); err != nil {
		return err
	}

	root := types.FsEntry{
		ID:        primitive.NewObjectID(),
		IsRoot:    true,
		EntryType: types.Directory,
		Permissions: types.FsEntryPermissions{
			WriteTags:            []string{"sysadmin"},
			ReadTags:             []string{"sysadmin", "user"},
			ExecuteTags:          []string{"sysadmin", "user"},
			UpdatePermissionTags: []string{"sysadmin"},
		},
		Timestamps: types.FileTimestamps{
			CreatedAt:  now,
			ModifiedAt: now,
			AccessedAt: now,
		},
		Entries: []types.FsEntryReference{
			{
				Name:  "etc",
				RefID: etc_folder.ID,
			},
			{
				Name:  "home",
				RefID: home_folder.ID,
			},
		},
	}
	if _, err := fileStore.Col.InsertOne(context.Background(), root); err != nil {
		return err
	}

	return nil
}
