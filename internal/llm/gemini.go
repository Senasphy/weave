package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"weave/internal/engine"
)

// GeminiProvider implements LLM for Google's Gemini models (Gemini 3.8 Flash, 3.1 Pro, etc.).
type GeminiProvider struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// NewGeminiProvider creates a new GeminiProvider reading GEMINI_API_KEY from environment if not supplied.
func NewGeminiProvider(apiKey string) *GeminiProvider {
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}
	return &GeminiProvider{
		apiKey:     apiKey,
		baseURL:    "https://generativelanguage.googleapis.com/v1beta",
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

// Call executes an agent turn against Google Gemini's generateContent endpoint.
func (p *GeminiProvider) Call(ctx context.Context, req engine.LLMRequest) (*engine.LLMResponse, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is not configured")
	}

	start := time.Now()

	var contents []map[string]any

	// Add input as initial user message
	inputBytes, _ := json.Marshal(map[string]any{
		"input": req.Input,
		"state": req.StateSnapshot,
	})
	contents = append(contents, map[string]any{
		"role": "user",
		"parts": []map[string]any{
			{"text": string(inputBytes)},
		},
	})

	for _, msg := range req.History {
		role := "user"
		if msg.Role == "assistant" || msg.Role == "model" {
			role = "model"
		}
		var parts []map[string]any
		if msg.Content != "" {
			parts = append(parts, map[string]any{"text": msg.Content})
		}
		for _, tc := range msg.ToolCalls {
			var args map[string]any
			if err := json.Unmarshal([]byte(tc.Arguments), &args); err != nil {
				args = map[string]any{"raw": tc.Arguments}
			}
			parts = append(parts, map[string]any{
				"functionCall": map[string]any{
					"name": tc.ToolName,
					"args": args,
				},
			})
		}
		if len(parts) > 0 {
			contents = append(contents, map[string]any{
				"role":  role,
				"parts": parts,
			})
		}
	}

	body := map[string]any{
		"contents": contents,
	}

	if req.SystemPrompt != "" {
		body["system_instruction"] = map[string]any{
			"parts": []map[string]any{
				{"text": req.SystemPrompt},
			},
		}
	}

	if len(req.Tools) > 0 {
		var declarations []map[string]any
		for _, t := range req.Tools {
			decl := map[string]any{
				"name":        t.Name,
				"description": t.Description,
			}
			if t.Parameters != nil {
				decl["parameters"] = t.Parameters
			}
			declarations = append(declarations, decl)
		}
		body["tools"] = []map[string]any{
			{"function_declarations": declarations},
		}
	}

	genConfig := map[string]any{}
	if req.Model.Temperature > 0 {
		genConfig["temperature"] = req.Model.Temperature
	}
	if req.Model.MaxTokens > 0 {
		genConfig["maxOutputTokens"] = req.Model.MaxTokens
	}
	if len(genConfig) > 0 {
		body["generationConfig"] = genConfig
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	modelName := req.Model.Name
	if !strings.HasPrefix(modelName, "models/") {
		modelName = "models/" + modelName
	}

	url := fmt.Sprintf("%s/%s:generateContent", p.baseURL, modelName)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", p.apiKey)

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Gemini request error: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("Gemini returned status %d: %s", resp.StatusCode, string(respBytes))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text         string `json:"text"`
					FunctionCall *struct {
						Name string         `json:"name"`
						Args map[string]any `json:"args"`
					} `json:"functionCall"`
				} `json:"parts"`
				Role string `json:"role"`
			} `json:"content"`
			FinishReason string `json:"finishReason"`
		} `json:"candidates"`
		UsageMetadata struct {
			PromptTokenCount     int `json:"promptTokenCount"`
			CandidatesTokenCount int `json:"candidatesTokenCount"`
			TotalTokenCount      int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}

	if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 {
		return nil, fmt.Errorf("Gemini returned empty candidates")
	}

	var contentBuilder strings.Builder
	var toolCalls []engine.ToolCall
	callIdx := 0

	for _, part := range geminiResp.Candidates[0].Content.Parts {
		if part.Text != "" {
			contentBuilder.WriteString(part.Text)
		}
		if part.FunctionCall != nil {
			callIdx++
			argsBytes, _ := json.Marshal(part.FunctionCall.Args)
			toolCalls = append(toolCalls, engine.ToolCall{
				ID:        fmt.Sprintf("call_%d", callIdx),
				ToolName:  part.FunctionCall.Name,
				Arguments: string(argsBytes),
			})
		}
	}

	cost := CalculateCost("gemini", req.Model.Name, geminiResp.UsageMetadata.PromptTokenCount, geminiResp.UsageMetadata.CandidatesTokenCount)

	return &engine.LLMResponse{
		Content:      contentBuilder.String(),
		ToolCalls:    toolCalls,
		InputTokens:  geminiResp.UsageMetadata.PromptTokenCount,
		OutputTokens: geminiResp.UsageMetadata.CandidatesTokenCount,
		CostUSD:      cost,
		LatencyMs:    time.Since(start).Milliseconds(),
	}, nil
}
