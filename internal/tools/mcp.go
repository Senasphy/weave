package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"weave/internal/engine"
)

// MCPClient communicates with an external Model Context Protocol (MCP) server via JSON-RPC.
type MCPClient struct {
	serverURL  string
	httpClient *http.Client
}

func NewMCPClient(serverURL string) *MCPClient {
	return &MCPClient{
		serverURL:  serverURL,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (m *MCPClient) Execute(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error) {
	if m.serverURL == "" {
		return nil, fmt.Errorf("MCP server URL is not configured")
	}

	rpcReq := map[string]any{
		"jsonrpc": "2.0",
		"id":      req.StepID,
		"method":  "tools/call",
		"params": map[string]any{
			"name":      req.ToolName,
			"arguments": req.Arguments,
		},
	}

	reqBytes, err := json.Marshal(rpcReq)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, m.serverURL, bytes.NewReader(reqBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := m.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("MCP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read with 5MB limit to prevent memory exhaustion DoS
	respBytes, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return nil, err
	}

	var rpcResp struct {
		Result any `json:"result"`
		Error  *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(respBytes, &rpcResp); err != nil {
		return nil, fmt.Errorf("failed to parse MCP response: %w", err)
	}

	if rpcResp.Error != nil {
		return nil, fmt.Errorf("MCP tool error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	return &engine.ToolResponse{
		Output:  rpcResp.Result,
		CostUSD: 0.0,
	}, nil
}
