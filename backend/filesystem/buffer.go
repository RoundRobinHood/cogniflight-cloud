package filesystem

import (
	"io"
	"os"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

// EditableBuffer is a helper for implementing file handlers.
// It keeps the entire file in memory, but doesn't provide Sync
type EditableBuffer struct {
	buffer  []byte
	lastLen int
	pos     int
	closed  bool

	perms types.FsNodePermissions
	tags  []string
}

func (b *EditableBuffer) Read(p []byte) (n int, err error) {
	if b.closed {
		return 0, os.ErrClosed
	}
	if !b.perms.IsAllowed(types.ReadMode, b.tags) {
		return 0, types.ErrCantAccessFs
	}
	if b.pos >= len(b.buffer) {
		return 0, io.EOF
	}
	n = copy(p, b.buffer[b.pos:])
	b.pos += n

	return
}

func (b *EditableBuffer) Write(p []byte) (n int, err error) {
	if b.closed {
		return 0, os.ErrClosed
	}
	if !b.perms.IsAllowed(types.WriteMode, b.tags) {
		return 0, types.ErrCantAccessFs
	}
	if b.pos > len(b.buffer) {
		gap := make([]byte, b.pos-len(b.buffer))
		b.buffer = append(b.buffer, gap...)
	}
	end := b.pos + len(p)
	if end > len(b.buffer) {
		if cap(b.buffer) < end {
			newBuf := make([]byte, end*2)
			copy(newBuf, b.buffer)
			b.buffer = newBuf[:len(b.buffer)]
		}
		b.buffer = b.buffer[:end]
	}
	n = copy(b.buffer[b.pos:], p)
	b.pos += n

	return
}

func (b *EditableBuffer) Seek(offset int64, whence int) (int64, error) {
	if b.closed {
		return 0, os.ErrClosed
	}
	var newPos int
	switch whence {
	case io.SeekStart:
		newPos = int(offset)
	case io.SeekCurrent:
		newPos = b.pos + int(offset)
	case io.SeekEnd:
		newPos = len(b.buffer) + int(offset)
	default:
		return 0, os.ErrInvalid
	}
	if newPos < 0 {
		return 0, os.ErrInvalid
	}

	b.pos = newPos
	return int64(b.pos), nil
}

func (b *EditableBuffer) Truncate(size int64) error {
	if b.closed {
		return os.ErrClosed
	}
	if !b.perms.IsAllowed(types.WriteMode, b.tags) {
		return types.ErrCantAccessFs
	}
	if size < 0 {
		return os.ErrInvalid
	}
	if size > int64(len(b.buffer)) {
		add := make([]byte, size-int64(len(b.buffer)))

		b.buffer = append(b.buffer, add...)
	} else {
		if b.pos > int(size) {
			b.pos = int(size)
		}
		b.buffer = b.buffer[:size]
	}

	return nil
}

func (b *EditableBuffer) Size() int64 {
	if b.closed {
		return int64(b.lastLen)
	}
	return int64(len(b.buffer))
}

func (b *EditableBuffer) Close() error {
	if b.closed {
		return os.ErrClosed
	}
	b.closed = true

	// signal for de-allocation
	b.lastLen = len(b.buffer)
	b.buffer = nil
	return nil
}

func (b *EditableBuffer) ReadFrom(r io.Reader) (int64, error) {
	if b.closed {
		return 0, os.ErrClosed
	}
	if !b.perms.IsAllowed(types.WriteMode, b.tags) {
		return 0, types.ErrCantAccessFs
	}

	b.Truncate(0)

	buf := make([]byte, 200)
	var err error
	for n := 0; err == nil; n, err = r.Read(buf) {
		if _, err := b.Write(buf[:n]); err != nil {
			return int64(len(b.buffer)), err
		}
	}

	if err == io.EOF {
		err = nil
	}

	return int64(len(b.buffer)), err
}

func (b *EditableBuffer) WriteTo(w io.Writer) (int64, error) {
	if b.closed {
		return 0, os.ErrClosed
	}
	if !b.perms.IsAllowed(types.ReadMode, b.tags) {
		return 0, types.ErrCantAccessFs
	}

	var total int64
	data := b.buffer
	for len(data) > 0 {
		n, err := w.Write(data)
		total += int64(n)
		if err != nil {
			return total, err
		}
		data = data[n:]
	}

	return total, nil
}
