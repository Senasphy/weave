package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"weave/internal/engine"
)

type AnthropicProvider struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func NewAnthropicProvider(apiKey string) *AnthropicProvider {
	if apiKey == "" {
		apiKey = os.Getenv("ANTHROPIC_API_KEY")
	}
	return &AnthropicProvider{
		apiKey:     apiKey,
		baseURL:    "https://api.anthropic.com/v1",
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func (p *AnthropicProvider) Call(ctx context.Context, req engine.LLMRequest) (*engine.LLMResponse, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("ANTHROPIC_API_KEY is not configured")
	}

	start := time.Now()

	// Build messages
	var messages []map[string]any
	inputBytes, _ := json.Marshal(map[string]any{
		"input": req.Input,
		"state": req.StateSnapshot,
	})
	messages = append(messages, map[string]any{
		"role":    "user",
		"content": string(inputBytes),
	})

	for _, msg := range req.History {
		role := msg.Role
		if role == "tool" {
			role = "user"
		}
		messages = append(messages, map[string]any{
			"role":    role,
			"content": msg.Content,
		})
	}

	maxTokens := 2048
	if req.Model.MaxTokens > 0 {
		maxTokens = req.Model.MaxTokens
	}

	body := map[string]any{
		"model":      req.Model.Name,
		"system":     req.SystemPrompt,
		"messages":   messages,
		"max_tokens": maxTokens,
	}

	// Tools for Anthropic
	if len(req.Tools) > 0 {
		var tools []map[string]any
		for _, t := range req.Tools {
			tools = append(tools, map[string]any{
				"name":         t.Name,
				"description":  t.Description,
				"input_schema": t.Parameters,
			})
		}
		body["tools"] = tools
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/messages", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Anthropic request error: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("Anthropic returned status %d: %s", resp.StatusCode, string(respBytes))
	}

	var anthropicResp struct {
		Content []struct {
			Type  string          `json:"type"`
			Text  string          `json:"text"`
			ID    string          `json:"id"`
			Name  string          `json:"name"`
			Input json.RawMessage `json:"input"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(respBytes, &anthropicResp); err != nil {
		return nil, fmt.Errorf("failed to parse Anthropic response: %w", err)
	}

	var textContent string
	var toolCalls []engine.ToolCall

	for _, c := range anthropicResp.Content {
		if c.Type == "text" {
			textContent += c.Text
		} else if c.Type == "tool_use" {
			toolCalls = append(toolCalls, engine.ToolCall{
				ID:        c.ID,
				ToolName:  c.Name,
				Arguments: string(c.Input),
			})
		}
	}

	cost := CalculateCost("anthropic", req.Model.Name, anthropicResp.Usage.InputTokens, anthropicResp.Usage.OutputTokens)

	return &engine.LLMResponse{
		Content:      textContent,
		ToolCalls:    toolCalls,
		InputTokens:  anthropicResp.Usage.InputTokens,
		OutputTokens: anthropicResp.Usage.OutputTokens,
		CostUSD:      cost,
		LatencyMs:    time.Since(start).Milliseconds(),
	}, nil
}
