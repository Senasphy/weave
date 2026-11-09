package engine

import (
	"sync"
)

// EventBroker maintains active real-time subscriber channels for runs.
type EventBroker struct {
	mu          sync.RWMutex
	subscribers map[string][]chan Event // runID -> list of channels
}

// NewEventBroker initializes an empty EventBroker.
func NewEventBroker() *EventBroker {
	return &EventBroker{
		subscribers: make(map[string][]chan Event),
	}
}

// Subscribe registers a listener channel for events belonging to the given runID.
// It returns the receive-only channel and an unsubscribe cleanup function.
func (b *EventBroker) Subscribe(runID string) (<-chan Event, func()) {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan Event, 64)
	b.subscribers[runID] = append(b.subscribers[runID], ch)

	unsubscribe := func() {
		b.mu.Lock()
		defer b.mu.Unlock()
		subs := b.subscribers[runID]
		for i, c := range subs {
			if c == ch {
				b.subscribers[runID] = append(subs[:i], subs[i+1:]...)
				close(ch)
				break
			}
		}
		if len(b.subscribers[runID]) == 0 {
			delete(b.subscribers, runID)
		}
	}

	return ch, unsubscribe
}

// Publish non-blockingly broadcasts an event to all subscribers listening to its runID.
func (b *EventBroker) Publish(ev Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	subs := b.subscribers[ev.RunID]
	for _, ch := range subs {
		select {
		case ch <- ev:
		default:
			// Buffer full, drop or let subscriber read
		}
	}
}
