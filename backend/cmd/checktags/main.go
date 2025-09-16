package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var snakeCase = regexp.MustCompile(`^[a-z0-9_]+$`)
var jsonTagRe = regexp.MustCompile(`json:"([^",]+)`)
var bsonTagRe = regexp.MustCompile(`bson:"([^",]+)`)

var violations = 0

func main() {
	fset := token.NewFileSet()

	err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return err
		}

		ast.Inspect(file, func(n ast.Node) bool {
			st, ok := n.(*ast.StructType)
			if !ok {
				return true
			}

			for _, field := range st.Fields.List {
				if field.Tag == nil {
					continue
				}

				tag := field.Tag.Value
				// Trim backticks
				tag = strings.Trim(tag, "`")

				checkTag(path, fset, field, tag, "json", jsonTagRe)
				checkTag(path, fset, field, tag, "bson", bsonTagRe)
			}

			return true
		})

		return nil
	})

	if err != nil {
		log.Fatal(err)
	}

	if violations != 0 {
		os.Exit(1)
	}
}

func checkTag(path string, fset *token.FileSet, field *ast.Field, tag, name string, re *regexp.Regexp) {
	matches := re.FindStringSubmatch(tag)
	if len(matches) < 2 {
		return
	}
	val := matches[1]
	if val == "-" {
		return
	}
	if !snakeCase.MatchString(val) {
		pos := fset.Position(field.Pos())
		fmt.Printf("%s:%d: %s tag '%s' is not snake_case\n", path, pos.Line, name, val)
		violations++
	}
}
