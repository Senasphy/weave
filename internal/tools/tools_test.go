package tools

import (
	"context"
	"net"
	"testing"

	"weave/internal/engine"
)

func TestBuiltin_Echo(t *testing.T) {
	resp, err := ExecuteEcho(engine.ToolRequest{
		ToolName:  "echo",
		Arguments: map[string]any{"msg": "hello world"},
	})
	if err != nil {
		t.Fatalf("echo failed: %v", err)
	}
	outMap, ok := resp.Output.(map[string]any)
	if !ok || outMap["msg"] != "hello world" {
		t.Fatalf("unexpected echo output: %+v", resp.Output)
	}
}

func TestBuiltin_Calculator(t *testing.T) {
	// Add
	resp, err := ExecuteCalculator(engine.ToolRequest{
		ToolName:  "calculator",
		Arguments: map[string]any{"operation": "add", "a": 10.5, "b": 4.5},
	})
	if err != nil {
		t.Fatalf("calculator add failed: %v", err)
	}
	outMap := resp.Output.(map[string]any)
	if outMap["result"] != 15.0 {
		t.Fatalf("expected 15.0, got %v", outMap["result"])
	}

	// Division by zero
	_, errDivZero := ExecuteCalculator(engine.ToolRequest{
		ToolName:  "calculator",
		Arguments: map[string]any{"operation": "divide", "a": 10, "b": 0},
	})
	if errDivZero == nil {
		t.Fatalf("expected error on division by zero, got nil")
	}
}

func TestHTTP_SSRFProtection(t *testing.T) {
	// Check private IPs
	if !IsPrivateOrForbiddenIP(net.ParseIP("127.0.0.1")) {
		t.Fatalf("expected 127.0.0.1 to be forbidden")
	}
	if !IsPrivateOrForbiddenIP(net.ParseIP("::1")) {
		t.Fatalf("expected ::1 to be forbidden")
	}
	if !IsPrivateOrForbiddenIP(net.ParseIP("::ffff:127.0.0.1")) {
		t.Fatalf("expected IPv4-mapped loopback to be forbidden")
	}
	if !IsPrivateOrForbiddenIP(net.ParseIP("10.0.0.5")) {
		t.Fatalf("expected 10.0.0.5 to be forbidden")
	}
	if !IsPrivateOrForbiddenIP(net.ParseIP("100.64.0.1")) {
		t.Fatalf("expected CGNAT 100.64.0.1 to be forbidden")
	}
	if !IsPrivateOrForbiddenIP(net.ParseIP("192.0.2.1")) {
		t.Fatalf("expected documentation IP 192.0.2.1 to be forbidden")
	}
	if !IsPrivateOrForbiddenIP(net.ParseIP("169.254.169.254")) {
		t.Fatalf("expected metadata IP 169.254.169.254 to be forbidden")
	}

	// Check public IP
	if IsPrivateOrForbiddenIP(net.ParseIP("8.8.8.8")) {
		t.Fatalf("expected 8.8.8.8 to be allowed")
	}

	// Attempt ExecuteHTTP to localhost -> must be blocked
	ctx := context.Background()
	_, err := ExecuteHTTP(ctx, engine.ToolRequest{
		ToolName:  "http_request",
		Arguments: map[string]any{"url": "http://127.0.0.1:8080/secret"},
	})
	if err == nil {
		t.Fatalf("expected SSRF error when requesting localhost, got nil")
	}
}

func TestDefaultToolRunner_Delegation(t *testing.T) {
	runner := NewDefaultToolRunner("")
	runner.Register("custom_math", func(ctx context.Context, req engine.ToolRequest) (*engine.ToolResponse, error) {
		return &engine.ToolResponse{
			Output:  map[string]any{"answer": 42},
			CostUSD: 0.0,
		}, nil
	})

	ctx := context.Background()
	resp, err := runner.Execute(ctx, engine.ToolRequest{
		ToolName: "custom_math",
	})
	if err != nil {
		t.Fatalf("custom tool execution failed: %v", err)
	}
	outMap := resp.Output.(map[string]any)
	if outMap["answer"] != 42 {
		t.Fatalf("expected 42, got %v", outMap["answer"])
	}
}
