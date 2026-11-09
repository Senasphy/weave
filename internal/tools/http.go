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

// SSRFBlockedError is returned when a target address resolves to a private, loopback, or metadata network.
type SSRFBlockedError struct {
	Host string
	IP   string
}

func (e SSRFBlockedError) Error() string {
	return fmt.Sprintf("SSRF blocked: host '%s' resolves to forbidden/private address %s", e.Host, e.IP)
}

func mustParseCIDR(s string) *net.IPNet {
	_, ipNet, err := net.ParseCIDR(s)
	if err != nil {
		panic(fmt.Sprintf("invalid CIDR %s: %v", s, err))
	}
	return ipNet
}

var forbiddenCIDRs = []*net.IPNet{
	mustParseCIDR("0.0.0.0/8"),       // Current network (RFC 1122)
	mustParseCIDR("10.0.0.0/8"),       // Private network (RFC 1918)
	mustParseCIDR("100.64.0.0/10"),    // Carrier grade NAT (RFC 6598)
	mustParseCIDR("127.0.0.0/8"),      // Loopback (RFC 1122)
	mustParseCIDR("169.254.0.0/16"),   // Link-local / Cloud metadata (RFC 3927)
	mustParseCIDR("172.16.0.0/12"),    // Private network (RFC 1918)
	mustParseCIDR("192.0.0.0/24"),     // IETF Protocol Assignments (RFC 6890)
	mustParseCIDR("192.0.2.0/24"),     // Documentation (RFC 5737)
	mustParseCIDR("192.88.99.0/24"),   // 6to4 relay anycast (RFC 7526)
	mustParseCIDR("192.168.0.0/16"),   // Private network (RFC 1918)
	mustParseCIDR("198.18.0.0/15"),    // Network interconnect benchmarking (RFC 2544)
	mustParseCIDR("198.51.100.0/24"),  // Documentation (RFC 5737)
	mustParseCIDR("203.0.113.0/24"),   // Documentation (RFC 5737)
	mustParseCIDR("224.0.0.0/4"),      // Multicast (RFC 5771)
	mustParseCIDR("240.0.0.0/4"),      // Reserved for future use (RFC 1112)
	mustParseCIDR("::/128"),           // IPv6 unspecified
	mustParseCIDR("::1/128"),          // IPv6 loopback
	mustParseCIDR("fc00::/7"),         // IPv6 unique local address (ULA - RFC 4193)
	mustParseCIDR("fe80::/10"),        // IPv6 link-local
	mustParseCIDR("ff00::/8"),         // IPv6 multicast
}

// IsPrivateOrForbiddenIP checks if an IP belongs to private, loopback, or metadata networks.
func IsPrivateOrForbiddenIP(ip net.IP) bool {
	if ip == nil {
		return true
	}

	// Normalize IPv4-mapped IPv6 address (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
	if ipv4 := ip.To4(); ipv4 != nil {
		ip = ipv4
	}

	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() || ip.IsUnspecified() {
		return true
	}

	for _, cidr := range forbiddenCIDRs {
		if cidr.Contains(ip) {
			return true
		}
	}

	return false
}

// newSafeHTTPClient creates an HTTP client with socket-level IP binding to prevent DNS rebinding TOCTOU attacks
// and redirect inspection to prevent redirect-based SSRF bypass.
func newSafeHTTPClient() *http.Client {
	dialer := &net.Dialer{
		Timeout:   10 * time.Second,
		KeepAlive: 30 * time.Second,
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}

			// Reject known cloud metadata domains immediately
			if strings.EqualFold(host, "metadata.google.internal") || strings.EqualFold(host, "metadata.local") {
				return nil, SSRFBlockedError{Host: host, IP: "metadata"}
			}

			ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
			if err != nil {
				return nil, fmt.Errorf("DNS resolution failed for host '%s': %w", host, err)
			}
			if len(ips) == 0 {
				return nil, fmt.Errorf("no IP addresses resolved for host '%s'", host)
			}

			// Reject if ANY resolved IP is in a private/forbidden range
			for _, ip := range ips {
				if IsPrivateOrForbiddenIP(ip) {
					return nil, SSRFBlockedError{Host: host, IP: ip.String()}
				}
			}

			// Pin connection to the first verified IP address to prevent DNS rebinding TOCTOU
			targetAddr := net.JoinHostPort(ips[0].String(), port)
			return dialer.DialContext(ctx, network, targetAddr)
		},
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 15 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	return &http.Client{
		Transport: transport,
		Timeout:   15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("stopped after 5 redirects")
			}

			if req.URL.Scheme != "http" && req.URL.Scheme != "https" {
				return fmt.Errorf("forbidden redirect scheme: %s", req.URL.Scheme)
			}

			host := req.URL.Hostname()
			if strings.EqualFold(host, "metadata.google.internal") || strings.EqualFold(host, "metadata.local") {
				return SSRFBlockedError{Host: host, IP: "metadata"}
			}

			ips, err := net.LookupIP(host)
			if err != nil {
				return fmt.Errorf("redirect DNS lookup failed for %s: %w", host, err)
			}
			for _, ip := range ips {
				if IsPrivateOrForbiddenIP(ip) {
					return SSRFBlockedError{Host: host, IP: ip.String()}
				}
			}

			return nil
		},
	}
}

// ExecuteHTTP executes outbound HTTP requests with socket-level and redirect-level SSRF protection.
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

	// Pre-flight check on host IP
	hostname := parsedURL.Hostname()
	if strings.EqualFold(hostname, "metadata.google.internal") || strings.EqualFold(hostname, "metadata.local") {
		return nil, SSRFBlockedError{Host: hostname, IP: "metadata"}
	}
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
		// Limit request body to 5MB
		if len(dataBytes) > 5*1024*1024 {
			return nil, fmt.Errorf("request body exceeds maximum limit of 5MB")
		}
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

	client := newSafeHTTPClient()
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read with 1MB limit to avoid memory exhaustion
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
