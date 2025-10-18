package cmd

type ChannelWriter chan string

func (c ChannelWriter) Write(p []byte) (n int, err error) {
	c <- string(p)
	return len(p), nil
}
