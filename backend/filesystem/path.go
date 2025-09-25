package filesystem

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

func CleanupAbsPath(path string) (string, error) {
	if len(path) == 0 {
		return "", fmt.Errorf("path cannot be empty string")
	}

	if path[0] != '/' {
		return "", fmt.Errorf("abs path must start with a /")
	}

	splits := strings.Split(path[1:], "/")

	result := make([]string, 0)

	for _, split := range splits {
		switch split {
		case "", ".":
			continue
		case "..":
			if len(result) == 0 {
				return "", fmt.Errorf("too many .. operators in path")
			} else {
				result = result[:len(result)-1]
			}
		default:
			result = append(result, split)
		}
	}

	return "/" + strings.Join(result, "/"), nil
}

func AbsPath(cwd, path string) (string, error) {
	if len(path) == 0 {
		return "", fmt.Errorf("path cannot be empty string")
	}

	if path[0] == '/' {
		// Abs path
		return CleanupAbsPath(path)
	} else {
		// Relative path
		return CleanupAbsPath(cwd + "/" + path)
	}
}

func Lookup(ctx context.Context, root types.FsDirectory, tags []string, abs_path string) (types.FsNode, error) {
	splits := strings.Split(abs_path[1:], "/")

	dir := root
	for i, name := range splits {
		if node, err := dir.Lookup(ctx, tags, name); err != nil {
			return nil, err
		} else if i == len(splits)-1 {
			return node, nil
		} else if node.NodeType() != types.Directory {
			return nil, os.ErrNotExist
		} else {
			dir = node.(types.FsDirectory)
		}
	}

	return nil, fmt.Errorf("error: impossible code point")
}
