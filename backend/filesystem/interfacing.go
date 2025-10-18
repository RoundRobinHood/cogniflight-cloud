package filesystem

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/sh"
)

type FSContext struct {
	Store    Store
	UserTags []string
}

func (c *FSContext) Stat(ctx context.Context, path string) (sh.FileInfo, error) {
	log.Printf("Stat %s\n", path)
	var zero sh.FileInfo
	if node, err := c.Store.Lookup(ctx, c.UserTags, path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return zero, nil
		} else {
			return zero, err
		}
	} else {
		executable := node.Permissions.IsAllowed(types.ExecuteMode, c.UserTags)
		readable := node.Permissions.IsAllowed(types.ReadMode, c.UserTags)
		writeable := node.Permissions.IsAllowed(types.WriteMode, c.UserTags)
		switch node.EntryType {
		case types.File:
			return sh.FileInfo{
				Type:       sh.FileRegular,
				Executable: executable,
				Readable:   readable,
				Writable:   writeable,
			}, nil
		case types.Directory:
			return sh.FileInfo{
				Type:       sh.FileDir,
				Executable: executable,
				Readable:   readable,
				Writable:   writeable,
			}, nil
		default:
			return zero, fmt.Errorf("invalid EntryType: %v", node.EntryType)
		}
	}
}
