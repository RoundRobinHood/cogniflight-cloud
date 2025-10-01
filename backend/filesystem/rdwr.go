package filesystem

import "io"

type RdwrFileStream struct {
	ReadStream  io.ReadWriteCloser
	WriteStream io.ReadWriteCloser
}

func (r *RdwrFileStream) Write(p []byte) (int, error) {
	return r.WriteStream.Write(p)
}

func (r *RdwrFileStream) Read(p []byte) (int, error) {
	return r.ReadStream.Read(p)
}

func (r *RdwrFileStream) Close() error {
	err1 := r.ReadStream.Close()
	err2 := r.WriteStream.Close()

	if err1 != nil {
		return err1
	}
	if err2 != nil {
		return err2
	}

	return nil
}
