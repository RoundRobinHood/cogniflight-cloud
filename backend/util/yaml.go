package util

import (
	"bytes"

	"github.com/goccy/go-yaml"
)

func YamlCRLF(v any) ([]byte, error) {
	data, err := yaml.Marshal(v)
	if err != nil {
		return nil, err
	} else {
		return bytes.ReplaceAll(data, []byte("\n"), []byte("\r\n")), nil
	}
}
