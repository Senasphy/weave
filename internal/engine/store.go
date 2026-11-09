package engine

import (
	"context"
	"fmt"
	"sync"

	"weave/internal/redact"
)

// Store defines persistence operations required by the execution engine.
type Store interface {
	AppendEvent(ctx context.Context, event Event) error
	GetEvents(ctx context.Context, runID string, afterSeq int64) ([]Event, error)
	GetRunState(ctx context.Context, runID string) (*RunState, error)
	SaveGate(ctx context.Context, gate GateRecord) error
	GetGate(ctx context.Context, gateID string) (*GateRecord, error)
	UpdateGate(ctx context.Context, gateID string, status, resolution, actor string, payload any) error
	GetPendingGates(ctx context.Context) ([]GateRecord, error)
}

// MemStore is a thread-safe, in-memory implementation of Store for engine testing.
type MemStore struct {
	mu     sync.RWMutex
	events map[string][]Event      // runID -> events
	gates  map[string]*GateRecord  // gateID -> gate
	seqs   map[string]int64        // runID -> currentSeq
}

// NewMemStore creates an initialized MemStore.
func NewMemStore() *MemStore {
	return &MemStore{
		events: make(map[string][]Event),
		gates:  make(map[string]*GateRecord),
		seqs:   make(map[string]int64),
	}
}

func (m *MemStore) AppendEvent(ctx context.Context, event Event) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Redact secrets and enforce 64KB max event payload size
	event.Payload = redact.SanitizePayload(event.Payload)

	runID := event.RunID
	currentSeq := m.seqs[runID]
	event.Seq = currentSeq + 1
	m.seqs[runID] = event.Seq

	m.events[runID] = append(m.events[runID], event)
	return nil
}

func (m *MemStore) GetEvents(ctx context.Context, runID string, afterSeq int64) ([]Event, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	all := m.events[runID]
	var res []Event
	for _, ev := range all {
		if ev.Seq > afterSeq {
			res = append(res, ev)
		}
	}
	return res, nil
}

func (m *MemStore) GetRunState(ctx context.Context, runID string) (*RunState, error) {
	m.mu.RLock()
	events := append([]Event(nil), m.events[runID]...)
	m.mu.RUnlock()

	if len(events) == 0 {
		return nil, fmt.Errorf("run '%s' not found", runID)
	}
	return FoldEvents(runID, events), nil
}

func (m *MemStore) SaveGate(ctx context.Context, gate GateRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	cp := gate
	m.gates[gate.GateID] = &cp
	return nil
}

func (m *MemStore) GetGate(ctx context.Context, gateID string) (*GateRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	g, ok := m.gates[gateID]
	if !ok {
		return nil, fmt.Errorf("gate '%s' not found", gateID)
	}
	cp := *g
	return &cp, nil
}

func (m *MemStore) UpdateGate(ctx context.Context, gateID string, status, resolution, actor string, payload any) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	g, ok := m.gates[gateID]
	if !ok {
		return fmt.Errorf("gate '%s' not found", gateID)
	}
	if g.Status != "waiting" {
		return fmt.Errorf("conflict: gate '%s' already resolved with status '%s'", gateID, g.Status)
	}

	g.Status = status
	g.Resolution = resolution
	g.ResolvedBy = actor
	g.Payload = payload
	return nil
}

func (m *MemStore) GetPendingGates(ctx context.Context) ([]GateRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var res []GateRecord
	for _, g := range m.gates {
		if g.Status == "waiting" {
			res = append(res, *g)
		}
	}
	return res, nil
}
