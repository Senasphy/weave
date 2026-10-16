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

type OpenAIProvider struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func NewOpenAIProvider(apiKey string) *OpenAIProvider {
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}
	return &OpenAIProvider{
		apiKey:     apiKey,
		baseURL:    "https://api.openai.com/v1",
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func (p *OpenAIProvider) Call(ctx context.Context, req engine.LLMRequest) (*engine.LLMResponse, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY is not configured")
	}

	start := time.Now()

	// Build messages
	var messages []map[string]any
	if req.SystemPrompt != "" {
		messages = append(messages, map[string]any{
			"role":    "system",
			"content": req.SystemPrompt,
		})
	}

	// Add input as initial user message
	inputBytes, _ := json.Marshal(map[string]any{
		"input": req.Input,
		"state": req.StateSnapshot,
	})
	messages = append(messages, map[string]any{
		"role":    "user",
		"content": string(inputBytes),
	})

	for _, msg := range req.History {
		m := map[string]any{
			"role":    msg.Role,
			"content": msg.Content,
		}
		if msg.ToolCallID != "" {
			m["tool_call_id"] = msg.ToolCallID
		}
		messages = append(messages, m)
	}

	// Tools
	var tools []map[string]any
	for _, t := range req.Tools {
		tools = append(tools, map[string]any{
			"type": "function",
			"function": map[string]any{
				"name":        t.Name,
				"description": t.Description,
				"parameters":  t.Parameters,
			},
		})
	}

	body := map[string]any{
		"model":       req.Model.Name,
		"messages":    messages,
		"temperature": req.Model.Temperature,
	}
	if len(tools) > 0 {
		body["tools"] = tools
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("OpenAI request error: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("OpenAI returned status %d: %s", resp.StatusCode, string(respBytes))
	}

	var openAIResp struct {
		Choices []struct {
			Message struct {
				Content   string `json:"content"`
				ToolCalls []struct {
					ID       string `json:"id"`
					Function struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
				} `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(respBytes, &openAIResp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	if len(openAIResp.Choices) == 0 {
		return nil, fmt.Errorf("OpenAI returned empty choices")
	}

	choice := openAIResp.Choices[0].Message
	var toolCalls []engine.ToolCall
	for _, tc := range choice.ToolCalls {
		toolCalls = append(toolCalls, engine.ToolCall{
			ID:        tc.ID,
			ToolName:  tc.Function.Name,
			Arguments: tc.Function.Arguments,
		})
	}

	cost := CalculateCost("openai", req.Model.Name, openAIResp.Usage.PromptTokens, openAIResp.Usage.CompletionTokens)

	return &engine.LLMResponse{
		Content:      choice.Content,
		ToolCalls:    toolCalls,
		InputTokens:  openAIResp.Usage.PromptTokens,
		OutputTokens: openAIResp.Usage.CompletionTokens,
		CostUSD:      cost,
		LatencyMs:    time.Since(start).Milliseconds(),
	}, nil
}
