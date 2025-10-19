package util

import (
	"math/rand"
	"strings"
)

func RandHex(size int) string {
	hex := "0123456789abcdef"
	output := strings.Builder{}
	output.Grow(size)

	for range size {
		output.WriteByte(hex[rand.Intn(15)])
	}

	return output.String()
}
