package filesystem

import (
	"fmt"
	"strings"
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

func DirUp(abs_path string) (string, string, error) {
	if cleaned, err := CleanupAbsPath(abs_path); err != nil {
		return "", "", err
	} else {
		splits := strings.Split(cleaned[1:], "/")
		if len(splits) < 1 {
			return "", "", fmt.Errorf("cannot perform DirUp on /")
		}

		return "/" + strings.Join(splits[:len(splits)-1], "/"), splits[len(splits)-1], nil
	}
}
