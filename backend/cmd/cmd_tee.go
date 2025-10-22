package cmd

import (
	"fmt"
	"io"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CmdTee struct {
	FileStore filesystem.Store
}

func (*CmdTee) Identifier() string {
	return "tee"
}

func (c *CmdTee) Run(ctx sh.CommandContext) int {
	if len(ctx.Args) == 0 {
		if _, err := io.Copy(ctx.Stdout, ctx.Stdin); err != nil {
			fmt.Fprint(ctx.Stderr, "failed to copy stdin: ", err)
			return 1
		}
		return 0
	}

	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no PWD available")
		return 1
	}
	tags := util.GetTags(ctx.Ctx)
	parents := make([]types.FsEntry, 0, len(ctx.Args)-1)
	filenames := make([]string, 0, len(ctx.Args)-1)
	for _, path := range ctx.Args[1:] {
		abs_path, err := filesystem.AbsPath(cwd, path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error: invalid path (%q): %v", path, err)
			return 1
		}
		folder_path, filename, err := filesystem.DirUp(abs_path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error: invalid path (%q): %v", abs_path, err)
			return 1
		}

		if parent, err := c.FileStore.Lookup(ctx.Ctx, tags, folder_path); err != nil {
			fmt.Fprintf(ctx.Stderr, "error: failed to get folder (%q): %v", folder_path, err)
			return 1
		} else {
			// Early permissions check (to help avoid problems later)
			if !parent.Permissions.IsAllowed(types.WriteMode, tags) {
				fmt.Fprintf(ctx.Stderr, "error: cannot write to folder (%q): %v", folder_path, err)
				return 1
			}
			if !parent.Permissions.IsAllowed(types.ExecuteMode, tags) {
				fmt.Fprintf(ctx.Stderr, "error: cannot descend into folder (%q): %v", folder_path, err)
				return 1
			}
			parents = append(parents, *parent)
			filenames = append(filenames, filename)
		}
	}

	fileRef := primitive.NewObjectID()
	stream, err := c.FileStore.Bucket.OpenUploadStreamWithID(fileRef, "")
	if err != nil {
		fmt.Fprintf(ctx.Stderr, "error: failed to open upload stream: %v", err)
		return 1
	}

	writer := io.MultiWriter(stream, ctx.Stdout)
	if _, err := io.Copy(writer, ctx.Stdin); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: failed to write to upload stream: %v", err)
		stream.Close()
		return 1
	}
	if err := stream.Close(); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: failed to close upload stream: %v", err)
		return 1
	}

	for i := range parents {
		if _, err := c.FileStore.WriteFile(ctx.Ctx, parents[i].ID, filenames[i], fileRef, tags); err != nil {
			fmt.Fprintf(ctx.Stderr, "error: failed to write file (%q): %v", filenames[i], err)
			return 1
		}
	}

	return 0
}
