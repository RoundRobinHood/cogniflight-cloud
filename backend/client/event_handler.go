package client

import (
	"sync"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
)

type EventListener[T any] struct {
	ch      *types.UnboundedChan[T]
	handler *EventHandler[T]
}

func (e *EventListener[T]) Out() <-chan T {
	if e.ch == nil {
		return nil
	}

	return e.ch.Out()
}

func (e *EventListener[T]) Unsubscribe() {
	e.handler.unsubscribe(e)
}

type EventHandler[T any] struct {
	listeners map[*EventListener[T]]struct{}

	mu *sync.RWMutex
}

func NewEventHandler[T any]() *EventHandler[T] {
	return &EventHandler[T]{
		listeners: map[*EventListener[T]]struct{}{},
		mu:        new(sync.RWMutex),
	}
}

func (e *EventHandler[T]) Subscribe() *EventListener[T] {
	e.mu.Lock()
	defer e.mu.Unlock()

	ret := &EventListener[T]{
		ch:      types.NewUnboundedChan[T](),
		handler: e,
	}

	e.listeners[ret] = struct{}{}

	return ret
}

func (e *EventHandler[T]) unsubscribe(l *EventListener[T]) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if _, ok := e.listeners[l]; ok {
		if l.ch != nil {
			l.ch.Close()
		}
	}
	l.ch = nil

	delete(e.listeners, l)
}

func (e *EventHandler[T]) Emit(data T) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	for listener := range e.listeners {
		if listener.ch != nil {
			listener.ch.In() <- data
		}
	}
}

func (e *EventHandler[T]) Close() {
	e.mu.Lock()
	defer e.mu.Unlock()

	for listener := range e.listeners {
		if listener.ch != nil {
			listener.ch.Close()
		}
	}

	e.listeners = map[*EventListener[T]]struct{}{}
}
