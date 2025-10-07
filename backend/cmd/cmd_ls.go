package cmd

import (
	"bytes"
	"fmt"
	"os"
	"strings"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/gridfs"
)

type CmdLs struct {
	FileStore filesystem.Store
}

func (*CmdLs) Identifier() string {
	return "ls"
}

func (c *CmdLs) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "error: no PWD available\r\n")
		return 1
	}

	ls_paths := []string{"."}
	long_format := false
	yaml_output := false
	if len(ctx.Args) > 1 {
		flags, paths, err := util.ParseArgs([]types.OptionDescriptor{
			{
				Identifier: "long_format",
				Aliases:    []string{"l"},
				Default:    false,
			},
			{
				Identifier: "yaml_output",
				Aliases:    []string{"y", "--yaml"},
				Default:    false,
			},
		}, ctx.Args[1:])
		if err != nil {
			fmt.Fprint(ctx.Stderr, err, "\r\n")
			return 1
		}

		long_format = flags["long_format"].(bool)
		yaml_output = flags["yaml_output"].(bool)

		if len(paths) > 0 {
			ls_paths = paths
		}
	}

	clean_paths := make([]string, 0, len(ls_paths))
	path_errors := map[string]string{}
	for _, path := range ls_paths {
		if !ok && path[0] != '/' {
			path_errors[path] = "can't do relative path without PWD"
			continue
		}

		if path[0] == '/' {
			clean_path, err := filesystem.CleanupAbsPath(path)
			if err != nil {
				path_errors[path] = fmt.Sprintf("invalid path: %v", err)
				continue
			}

			clean_paths = append(clean_paths, clean_path)
		} else {
			clean_path, err := filesystem.AbsPath(cwd, path)
			if err != nil {
				path_errors[path] = fmt.Sprintf("invalid path: %v", err)
				continue
			}

			clean_paths = append(clean_paths, clean_path)
		}
	}

	for path, errStr := range path_errors {
		if len(ls_paths) > 1 {
			fmt.Fprintf(ctx.Stderr, "%s:\r\n", path)
		}
		fmt.Fprintf(ctx.Stderr, "error: %s\r\n\r\n", errStr)
	}

	if len(path_errors) != 0 {
		return 1
	}

	for i, path := range clean_paths {
		if len(clean_paths) > 1 {
			fmt.Fprintf(ctx.Stdout, "%s:\r\n", ls_paths[i])
		}
		type EntryInfo struct {
			EntryName string
			types.FsEntry
		}
		entries := make([]EntryInfo, 0)
		if node, err := c.FileStore.Lookup(ctx.Ctx, tags, path); err != nil {
			fmt.Fprintf(ctx.Stderr, "Failed to fetch directory (abs_path %q): \r\n%v\r\n", path, err)
			return 1
		} else {
			if node.EntryType != types.Directory {
				fmt.Fprintf(ctx.Stderr, "error: (abs_path %q) is not a directory\r\n", path)
				return 1
			}
			for _, entry := range node.Entries {
				var child types.FsEntry
				if err := c.FileStore.Col.FindOne(ctx.Ctx, bson.M{"_id": entry.RefID}).Decode(&child); err != nil {
					if err == os.ErrNotExist {
						fmt.Fprintf(ctx.Stderr, "internal issue: %q entry does not have a corresponding document", entry.Name)
					} else {
						fmt.Fprintf(ctx.Stderr, "error getting file: %v", err)
					}
					return 1
				}
				entries = append(entries, EntryInfo{entry.Name, child})
			}
		}

		if !long_format {
			for _, entry := range entries {
				if yaml_output {
					data, err := util.YamlCRLF(map[string]string{
						"name": entry.EntryName,
						"type": entry.EntryType.String(),
					})
					if err != nil {
						fmt.Fprintf(ctx.Stderr, "error formatting file YAML: %v", err)
						return 1
					}

					fmt.Fprint(ctx.Stdout, "- ")
					fmt.Fprint(ctx.Stdout, string(bytes.ReplaceAll(data, []byte("\n"), []byte("\n  "))), "\r\n")
				} else {
					switch entry.EntryType {
					case types.Directory:
						fmt.Fprintf(ctx.Stdout, "\x1b[34m%s\x1b[0m\r\n", entry.EntryName)
					case types.File:
						fallthrough
					default:
						fmt.Fprintf(ctx.Stdout, "%s\r\n", entry.EntryName)
					}
				}
			}
		} else {
			for _, entry := range entries {
				file_count := 1
				if entry.EntryType == types.Directory {
					file_count = len(entry.Entries)
				}
				file_size := int64(0)
				if entry.EntryType == types.File && entry.FileReference != nil {
					var fileInfo gridfs.File
					if err := c.FileStore.Bucket.GetFilesCollection().FindOne(ctx.Ctx, bson.M{"_id": entry.FileReference}).Decode(&fileInfo); err != nil {
						fmt.Fprintf(ctx.Stderr, "error checking file size: %v", err)
						return 1
					}
					file_size = fileInfo.Length
				}

				modify_time := entry.Timestamps.ModifiedAt.Format("Jan _2 15:04 2006")
				if yaml_output {
					data, err := util.YamlCRLF(map[string]any{
						"type":          entry.EntryType.String(),
						"permissions":   entry.Permissions,
						"file_count":    file_count,
						"file_size":     file_size,
						"modified_time": modify_time,
						"name":          entry.EntryName,
					})
					if err != nil {
						fmt.Fprintf(ctx.Stderr, "error formatting file YAML: %v", err)
						return 1
					}

					fmt.Fprint(ctx.Stdout, "- ")
					fmt.Fprint(ctx.Stdout, string(bytes.ReplaceAll(data, []byte("\n"), []byte("\n  "))), "\r\n")
				} else {
					name_str := entry.EntryName
					type_str := entry.EntryType.String() + "\t"
					if entry.EntryType == types.Directory {
						name_str = fmt.Sprintf("\x1b[34m%s\x1b[0m", name_str)
					} else {
						type_str += "\t"
					}
					fmt.Fprint(ctx.Stdout,
						type_str,
						strings.Join(entry.Permissions.ReadTags, ","), "\t",
						strings.Join(entry.Permissions.WriteTags, ","), "\t",
						strings.Join(entry.Permissions.ExecuteTags, ","), "\t",
						strings.Join(entry.Permissions.UpdatePermissionTags, ","), "\t",
						file_count, "\t",
						file_size, "\t",
						modify_time, "\t",
						name_str, "\r\n")
				}
			}
		}
	}

	return 0
}
