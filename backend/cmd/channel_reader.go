package cmd

import (
	"io"
)

type ChannelReader struct {
	Chan   chan string
	Buffer []byte
}

func (c *ChannelReader) Read(p []byte) (n int, err error) {
	if len(c.Buffer) > 0 {
		if len(c.Buffer) < len(p) {
			length := len(c.Buffer)
			copy(p, c.Buffer)
			c.Buffer = nil

			return length, nil
		} else {
			copy(p, c.Buffer)
			c.Buffer = c.Buffer[len(p):]
			return len(p), nil
		}
	} else {
		str, ok := <-c.Chan
		if !ok {
			return 0, io.EOF
		} else {
			length := copy(p, []byte(str))
			if len(str) > len(p) {
				c.Buffer = []byte(str)[len(p):]
			}
			return length, nil
		}
	}
}
