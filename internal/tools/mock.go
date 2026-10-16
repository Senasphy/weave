package tools

import (
	"context"
	"fmt"
	"sync"
	"weave/internal/engine"
)

// MockToolRunner provides deterministic mock tool execution.
type MockToolRunner struct {
	mu       sync.Mutex
	handlers map[string]func(req engine.ToolRequest) (*engine.ToolResponse, error)
	calls    []engine.ToolRequest
}

// NewMockToolRunner creates an initialized MockToolRunner.
func NewMockToolRunner() *MockToolRunner {
	return &MockToolRunner{
		handlers: make(map[string]func(req engine.ToolRequest) (*engine.ToolResponse, error)),
	}
}

func (m *MockToolRunner) Register(name string, fn func(req engine.ToolRequest) (*engine.ToolResponse, error)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handlers[name] = fn
}

func (m *MockToolRunner) Execute(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.calls = append(m.calls, req)
	if fn, ok := m.handlers[req.ToolName]; ok {
		return fn(req)
	}

	return &engine.ToolResponse{
		Output:  map[string]any{"result": fmt.Sprintf("executed tool '%s'", req.ToolName)},
		CostUSD: 0.0,
	}, nil
}
