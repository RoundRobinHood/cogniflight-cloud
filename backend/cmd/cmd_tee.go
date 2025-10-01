package cmd

import (
	"fmt"
	"io"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CmdTee struct {
	FileStore filesystem.Store
}

func (*CmdTee) Identifier() string {
	return "tee"
}

func (c *CmdTee) Run(ctx types.CommandContext) int {
	if len(ctx.Args) == 0 {
		cat_ctx := ctx
		cat_ctx.Args = []string{"cat"}
		return (&CmdCat{FileStore: c.FileStore}).Run(cat_ctx)
	}

	parents := make([]types.FsEntry, 0, len(ctx.Args)-1)
	filenames := make([]string, 0, len(ctx.Args)-1)
	for _, path := range ctx.Args[1:] {
		folder_path, filename, err := filesystem.DirUp(path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "error: invalid path (%q): %v", path, err)
			return 1
		}

		if parent, err := c.FileStore.Lookup(ctx.Ctx, ctx.ParentTags, folder_path); err != nil {
			fmt.Fprintln(ctx.Stderr, "error: failed to get folder (%q): %v", folder_path, err)
			return 1
		} else {
			// Early permissions check (to help avoid problems later)
			if !parent.Permissions.IsAllowed(types.WriteMode, ctx.ParentTags) {
				fmt.Fprintf(ctx.Stderr, "error: cannot write to folder (%q): %v", err)
				return 1
			}
			if !parent.Permissions.IsAllowed(types.ExecuteMode, ctx.ParentTags) {
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

	if _, err := io.Copy(stream, ctx.Stdin); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: failed to write to upload stream: %v", err)
		stream.Close()
		return 1
	}
	if err := stream.Close(); err != nil {
		fmt.Fprintf(ctx.Stderr, "error: failed to close upload stream: %v", err)
		return 1
	}

	for i := range parents {
		if _, err := c.FileStore.WriteFile(ctx.Ctx, parents[i].ID, filenames[i], fileRef, ctx.ParentTags); err != nil {
			fmt.Fprintf(ctx.Stderr, "error: failed to write file (%q): %v", filenames[i], err)
			return 1
		}
	}

	return 0
}
