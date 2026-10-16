package llm

import (
	"context"
	"sync"
	"weave/internal/engine"
)

// MockProvider provides deterministic responses for testing and zero-key workflows.
type MockProvider struct {
	mu        sync.Mutex
	responses map[string]*engine.LLMResponse
	queue     []*engine.LLMResponse
	calls     []engine.LLMRequest
}

// NewMockProvider creates an initialized MockProvider.
func NewMockProvider() *MockProvider {
	return &MockProvider{
		responses: make(map[string]*engine.LLMResponse),
		queue:     make([]*engine.LLMResponse, 0),
	}
}

func (m *MockProvider) Enqueue(resp *engine.LLMResponse) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.queue = append(m.queue, resp)
}

func (m *MockProvider) Call(ctx context.Context, req engine.LLMRequest) (*engine.LLMResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.calls = append(m.calls, req)

	if len(m.queue) > 0 {
		resp := m.queue[0]
		m.queue = m.queue[1:]
		return resp, nil
	}

	return &engine.LLMResponse{
		Content:      `{"status": "ok", "category": "refund", "amount": 50, "findings": ["verified"]}`,
		InputTokens:  10,
		OutputTokens: 20,
		CostUSD:      0.0,
	}, nil
}
