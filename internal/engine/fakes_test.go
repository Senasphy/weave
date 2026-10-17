package engine

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// FakeClock allows manual advancement of time.
type FakeClock struct {
	mu  sync.Mutex
	now time.Time
}

func NewFakeClock(t time.Time) *FakeClock {
	return &FakeClock{now: t}
}

func (f *FakeClock) Now() time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.now
}

func (f *FakeClock) Advance(d time.Duration) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.now = f.now.Add(d)
}

func (f *FakeClock) Since(t time.Time) time.Duration {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.now.Sub(t)
}

// FakeLLM provides deterministic scripted responses.
type FakeLLM struct {
	mu        sync.Mutex
	responses map[string]*LLMResponse // keyed by prompt or sequence
	queue     []*LLMResponse
	calls     []LLMRequest
	callCount int
	onCall    func(req LLMRequest)
}

func NewFakeLLM() *FakeLLM {
	return &FakeLLM{
		responses: make(map[string]*LLMResponse),
		queue:     make([]*LLMResponse, 0),
	}
}

func (f *FakeLLM) SetOnCall(fn func(req LLMRequest)) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.onCall = fn
}

func (f *FakeLLM) Enqueue(resp *LLMResponse) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.queue = append(f.queue, resp)
}

func (f *FakeLLM) Call(ctx context.Context, req LLMRequest) (*LLMResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.calls = append(f.calls, req)
	f.callCount++
	if f.onCall != nil {
		f.onCall(req)
	}

	if len(f.queue) > 0 {
		resp := f.queue[0]
		f.queue = f.queue[1:]
		return resp, nil
	}

	// Default fallback response
	return &LLMResponse{
		Content:      `{"status": "ok", "category": "billing", "amount": 150}`,
		InputTokens:  10,
		OutputTokens: 20,
		CostUSD:      0.001,
	}, nil
}

// FakeToolRunner provides deterministic tool executions.
type FakeToolRunner struct {
	mu       sync.Mutex
	handlers map[string]func(req ToolRequest) (*ToolResponse, error)
	requests []ToolRequest
}

func NewFakeToolRunner() *FakeToolRunner {
	return &FakeToolRunner{
		handlers: make(map[string]func(req ToolRequest) (*ToolResponse, error)),
	}
}

func (f *FakeToolRunner) Register(name string, fn func(req ToolRequest) (*ToolResponse, error)) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.handlers[name] = fn
}

func (f *FakeToolRunner) Execute(ctx context.Context, req ToolRequest) (*ToolResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.requests = append(f.requests, req)
	if fn, ok := f.handlers[req.ToolName]; ok {
		return fn(req)
	}

	return &ToolResponse{
		Output:  map[string]any{"result": fmt.Sprintf("executed %s", req.ToolName)},
		CostUSD: 0.0005,
	}, nil
}
