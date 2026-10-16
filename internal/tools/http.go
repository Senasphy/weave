package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"weave/internal/engine"
)

// SSRFBlockedError is returned when a target address resolves to a private or metadata network.
type SSRFBlockedError struct {
	Host string
	IP   string
}

func (e SSRFBlockedError) Error() string {
	return fmt.Sprintf("SSRF blocked: host '%s' resolves to forbidden/private address %s", e.Host, e.IP)
}

// IsPrivateOrForbiddenIP checks if an IP belongs to private, loopback, or metadata networks.
func IsPrivateOrForbiddenIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() {
		return true
	}
	// Cloud metadata IP (169.254.169.254)
	if ip.Equal(net.ParseIP("169.254.169.254")) {
		return true
	}
	return false
}

// ExecuteHTTP executes outbound HTTP requests with strict SSRF protection.
func ExecuteHTTP(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error) {
	urlStr, ok := req.Arguments["url"].(string)
	if !ok || urlStr == "" {
		return nil, fmt.Errorf("argument 'url' is required")
	}

	method, _ := req.Arguments["method"].(string)
	if method == "" {
		method = "GET"
	}
	method = strings.ToUpper(method)

	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return nil, fmt.Errorf("unsupported URL scheme '%s', must be http or https", parsedURL.Scheme)
	}

	// SSRF check on host IP
	hostname := parsedURL.Hostname()
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return nil, fmt.Errorf("DNS lookup failed for %s: %w", hostname, err)
	}
	for _, ip := range ips {
		if IsPrivateOrForbiddenIP(ip) {
			return nil, SSRFBlockedError{Host: hostname, IP: ip.String()}
		}
	}

	var reqBody io.Reader
	if bodyData, exists := req.Arguments["body"]; exists && bodyData != nil {
		dataBytes, _ := json.Marshal(bodyData)
		reqBody = bytes.NewReader(dataBytes)
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, urlStr, reqBody)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("User-Agent", "Weave-Agent-Runner/1.0")
	if req.IdempotencyKey != "" {
		httpReq.Header.Set("Idempotency-Key", req.IdempotencyKey)
	}

	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read with 1MB limit
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var parsedOutput any
	if err := json.Unmarshal(bodyBytes, &parsedOutput); err != nil {
		parsedOutput = string(bodyBytes)
	}

	return &engine.ToolResponse{
		Output: map[string]any{
			"status_code": resp.StatusCode,
			"body":        parsedOutput,
		},
		CostUSD: 0.0,
	}, nil
}
