package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"weave/internal/engine"
	"weave/internal/graph"
)

func TestGeminiProvider_Call(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-goog-api-key") != "test-key" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if r.Header.Get("Content-Type") != "application/json" {
			http.Error(w, "bad content type", http.StatusBadRequest)
			return
		}

		resp := map[string]any{
			"candidates": []map[string]any{
				{
					"content": map[string]any{
						"parts": []map[string]any{
							{"text": "Analysis complete."},
							{
								"functionCall": map[string]any{
									"name": "calculator",
									"args": map[string]any{"expression": "40 + 2"},
								},
							},
						},
						"role": "model",
					},
					"finishReason": "STOP",
				},
			},
			"usageMetadata": map[string]any{
				"promptTokenCount":     100,
				"candidatesTokenCount": 50,
				"totalTokenCount":      150,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	provider := &GeminiProvider{
		apiKey:     "test-key",
		baseURL:    server.URL,
		httpClient: server.Client(),
	}

	req := engine.LLMRequest{
		Model: graph.ModelConfig{
			Provider: "gemini",
			Name:     "gemini-3.8-flash",
		},
		SystemPrompt: "You are an analytical assistant.",
		Input:        map[string]any{"query": "calculate value"},
		Tools: []engine.ToolDefinition{
			{
				Name:        "calculator",
				Description: "Evaluates expressions",
			},
		},
	}

	resp, err := provider.Call(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Content != "Analysis complete." {
		t.Errorf("expected content 'Analysis complete.', got '%s'", resp.Content)
	}
	if len(resp.ToolCalls) != 1 {
		t.Fatalf("expected 1 tool call, got %d", len(resp.ToolCalls))
	}
	if resp.ToolCalls[0].ToolName != "calculator" {
		t.Errorf("expected tool name 'calculator', got '%s'", resp.ToolCalls[0].ToolName)
	}
	if resp.InputTokens != 100 || resp.OutputTokens != 50 {
		t.Errorf("unexpected tokens: in=%d, out=%d", resp.InputTokens, resp.OutputTokens)
	}
	if resp.CostUSD <= 0 {
		t.Errorf("expected positive cost for gemini-3.8-flash, got %f", resp.CostUSD)
	}
}

func TestGeminiProvider_MissingKey(t *testing.T) {
	provider := &GeminiProvider{
		apiKey: "",
	}
	_, err := provider.Call(context.Background(), engine.LLMRequest{})
	if err == nil {
		t.Fatal("expected error for missing API key")
	}
}
