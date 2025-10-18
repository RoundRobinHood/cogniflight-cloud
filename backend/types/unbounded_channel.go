package types

import "sync"

type UnboundedChan[T any] struct {
	in     chan T // senders push into here, never blocks
	out    chan T // receivers read from here
	buffer []T
	mu     sync.Mutex
}

func NewUnboundedChan[T any]() *UnboundedChan[T] {
	uc := &UnboundedChan[T]{
		in:  make(chan T, 16), // small internal buffer
		out: make(chan T, 16), // receiver-facing buffer
	}
	go uc.run()
	return uc
}

func (uc *UnboundedChan[T]) run() {
	for {
		var out chan T
		var next T
		if len(uc.buffer) > 0 {
			out = uc.out
			next = uc.buffer[0]
		}

		select {
		case v, ok := <-uc.in:
			if !ok {
				// sender closed: flush remaining items then close out
				for _, x := range uc.buffer {
					uc.out <- x
				}
				close(uc.out)
				return
			}
			uc.buffer = append(uc.buffer, v)

		case out <- next:
			uc.buffer = uc.buffer[1:]
		}
	}
}

func (uc *UnboundedChan[T]) In() chan<- T  { return uc.in }
func (uc *UnboundedChan[T]) Out() <-chan T { return uc.out }
func (uc *UnboundedChan[T]) Close()        { close(uc.in) }
