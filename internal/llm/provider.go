package llm

import (
	"context"
	"fmt"
	"strings"

	"weave/internal/engine"
)

// MultiProvider routes LLM requests to the appropriate provider adapter.
type MultiProvider struct {
	openAI    *OpenAIProvider
	anthropic *AnthropicProvider
	gemini    *GeminiProvider
	mock      *MockProvider
}

// NewMultiProvider creates a router configured from environment variables.
func NewMultiProvider() *MultiProvider {
	return &MultiProvider{
		openAI:    NewOpenAIProvider(""),
		anthropic: NewAnthropicProvider(""),
		gemini:    NewGeminiProvider(""),
		mock:      NewMockProvider(),
	}
}

// Call routes to the configured provider.
func (m *MultiProvider) Call(ctx context.Context, req engine.LLMRequest) (*engine.LLMResponse, error) {
	provider := strings.ToLower(req.Model.Provider)
	switch provider {
	case "openai":
		return m.openAI.Call(ctx, req)
	case "anthropic":
		return m.anthropic.Call(ctx, req)
	case "gemini", "google":
		return m.gemini.Call(ctx, req)
	case "mock", "":
		return m.mock.Call(ctx, req)
	default:
		return nil, fmt.Errorf("unsupported model provider '%s'", req.Model.Provider)
	}
}
