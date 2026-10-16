package tools

import (
	"context"
	"fmt"
	"sync"

	"weave/internal/engine"
)

// DefaultToolRunner manages and delegates tool invocations.
type DefaultToolRunner struct {
	mu        sync.RWMutex
	mcpClient *MCPClient
	custom    map[string]func(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error)
}

func NewDefaultToolRunner(mcpServerURL string) *DefaultToolRunner {
	return &DefaultToolRunner{
		mcpClient: NewMCPClient(mcpServerURL),
		custom:    make(map[string]func(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error)),
	}
}

func (r *DefaultToolRunner) Register(name string, fn func(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error)) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.custom[name] = fn
}

func (r *DefaultToolRunner) Execute(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error) {
	r.mu.RLock()
	customFn, isCustom := r.custom[req.ToolName]
	r.mu.RUnlock()

	if isCustom {
		return customFn(ctx, req)
	}

	switch req.ToolName {
	case "echo":
		return ExecuteEcho(req)
	case "calculator":
		return ExecuteCalculator(req)
	case "http_request":
		return ExecuteHTTP(ctx, req)
	default:
		// Try MCP client if configured
		if r.mcpClient != nil && r.mcpClient.serverURL != "" {
			return r.mcpClient.Execute(ctx, req)
		}
		return nil, fmt.Errorf("tool '%s' is not registered or supported", req.ToolName)
	}
}
