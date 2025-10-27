package cmd

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/filesystem"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	"github.com/RoundRobinHood/sh"
	"github.com/sourcegraph/jsonrpc2"
)

type CmdEmbed struct {
	Conn      *jsonrpc2.Conn
	FileStore filesystem.Store
}

func (c *CmdEmbed) Identifier() string {
	return "embed"
}

func (c *CmdEmbed) Run(ctx sh.CommandContext) int {
	tags := util.GetTags(ctx.Ctx)

	if len(ctx.Args) == 1 {
		fmt.Fprint(ctx.Stderr, "usage: embed <IMG FILES...>")
		return 1
	}

	cwd, ok := ctx.Env["PWD"]
	if !ok {
		fmt.Fprint(ctx.Stderr, "missing PWD")
		return 1
	}

	paths := ctx.Args[1:]
	abs_paths := make([]string, len(paths))
	for i, path := range paths {
		if abs_path, err := filesystem.AbsPath(cwd, path); err != nil {
			fmt.Fprintf(ctx.Stderr, "invalid path (%q): %v", path, err)
			return 1
		} else {
			abs_paths[i] = abs_path
		}
	}

	for i, path := range abs_paths {
		fileNode, err := c.FileStore.Lookup(ctx.Ctx, tags, path)
		if err != nil {
			fmt.Fprintf(ctx.Stderr, "couldn't look up %q: %v", paths[i], err)
			return 1
		}

		if fileNode.EntryType != types.File {
			fmt.Fprintf(ctx.Stderr, "error: %q is not a file", paths[i])
			return 1
		}

		if fileNode.FileReference == nil {
			fmt.Fprintf(ctx.Stderr, "error: %q is empty", paths[i])
			return 1
		}

		var EmbedResponse struct {
			Successful bool      `json:"success"`
			Embedding  []float64 `json:"embedding"`
			Error      string    `json:"error"`
		}

		timeOutCtx, cancel := context.WithTimeout(ctx.Ctx, 5*time.Second)
		defer cancel()
		if err := c.Conn.Call(timeOutCtx, "generate_face_embedding_from_objectid", map[string]string{"object_id": fileNode.FileReference.Hex()}, &EmbedResponse); err != nil {
			fmt.Fprintf(ctx.Stderr, "error (%q): failed to perform JSON-RPC call: %v", paths[i], err)
			return 1
		}

		if !EmbedResponse.Successful {
			fmt.Fprintf(ctx.Stderr, "error response (%q): %s", paths[i], EmbedResponse.Error)
			return 1
		}

		buf := new(bytes.Buffer)

		for _, v := range EmbedResponse.Embedding {
			binary.Write(buf, binary.LittleEndian, v)
		}

		encoded := base64.StdEncoding.EncodeToString(buf.Bytes())
		fmt.Fprint(ctx.Stdout, encoded, "\r\n")
	}

	return 0
}
