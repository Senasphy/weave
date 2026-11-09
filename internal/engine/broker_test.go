package engine

import (
	"encoding/json"
	"testing"
	"time"
)

func TestEventBroker_PubSubAndIsolation(t *testing.T) {
	broker := NewEventBroker()

	ch1, unsub1 := broker.Subscribe("run_1")
	defer unsub1()

	ch2, unsub2 := broker.Subscribe("run_2")
	defer unsub2()

	ev1 := Event{
		ID:        "ev_1",
		RunID:     "run_1",
		Seq:       1,
		Type:      EventStepStarted,
		Payload:   json.RawMessage(`{}`),
		Timestamp: time.Now(),
	}

	broker.Publish(ev1)

	// ch1 should receive ev1
	select {
	case received := <-ch1:
		if received.ID != "ev_1" || received.RunID != "run_1" {
			t.Fatalf("unexpected event received: %+v", received)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatalf("timeout waiting for event on ch1")
	}

	// ch2 should NOT receive ev1
	select {
	case received := <-ch2:
		t.Fatalf("ch2 should not have received event for run_1, got: %+v", received)
	default:
		// expected
	}

	// Unsubscribe ch1
	unsub1()

	// Publish another event to run_1
	ev2 := Event{
		ID:        "ev_2",
		RunID:     "run_1",
		Seq:       2,
		Type:      EventStepSucceeded,
		Payload:   json.RawMessage(`{}`),
		Timestamp: time.Now(),
	}
	broker.Publish(ev2)

	// Since unsubscribed, channel should be closed or empty
	select {
	case _, ok := <-ch1:
		if ok {
			t.Fatalf("expected ch1 to be closed after unsubscribe")
		}
	default:
		// closed channel read returns immediately with ok=false
	}
}
