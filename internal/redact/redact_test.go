package redact

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRedactString_SecretsAndTokens(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Secret placeholder",
			input:    "Connecting with api_key: ${secret:STRIPE_PROD_KEY}",
			expected: "Connecting with api_key: [REDACTED_SECRET]",
		},
		{
			name:     "OpenAI API key",
			input:    "Authorization: sk-1234567890abcdef1234567890abcdef",
			expected: "Authorization: [REDACTED_OPENAI_KEY]",
		},
		{
			name:     "Anthropic API key",
			input:    "Key is sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456",
			expected: "Key is [REDACTED_ANTHROPIC_KEY]",
		},
		{
			name:     "Google Gemini API key",
			input:    "Key is AIzaSyD9ABCDEF1234567890abcdefghijk123",
			expected: "Key is [REDACTED_GOOGLE_KEY]",
		},
		{
			name:     "Bearer token",
			input:    "Header Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz",
			expected: "Header Bearer [REDACTED]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := RedactString(tt.input)
			if got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, got)
			}
		})
	}
}

func TestRedactAny_MapSensitiveKeys(t *testing.T) {
	input := map[string]any{
		"user":           "alice",
		"password":       "supersecret123",
		"API_KEY":        "sk-live-fake-stripe-key-99999",
		"token":          "ghp_123456789012345678901234567890123456",
		"webhook_secret": "whsec_abcdef123456",
		"nested": map[string]any{
			"authorization": "Bearer mysecrettoken1234567890",
			"public_info":   "nothing sensitive here",
		},
	}

	cleaned, ok := RedactAny(input).(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any, got %T", cleaned)
	}

	if cleaned["password"] != "[REDACTED]" {
		t.Errorf("expected password to be [REDACTED], got %v", cleaned["password"])
	}
	if cleaned["API_KEY"] != "[REDACTED]" {
		t.Errorf("expected API_KEY to be [REDACTED], got %v", cleaned["API_KEY"])
	}
	if cleaned["token"] != "[REDACTED]" {
		t.Errorf("expected token to be [REDACTED], got %v", cleaned["token"])
	}

	nested := cleaned["nested"].(map[string]any)
	if nested["authorization"] != "[REDACTED]" {
		t.Errorf("expected nested authorization to be [REDACTED], got %v", nested["authorization"])
	}
	if nested["public_info"] != "nothing sensitive here" {
		t.Errorf("expected public_info to be untouched, got %v", nested["public_info"])
	}
}

func TestTruncatePayload_Enforces64KB(t *testing.T) {
	// Construct a massive 100KB payload
	largeString := strings.Repeat("A", 100*1024)
	largePayload, _ := json.Marshal(map[string]any{"data": largeString})

	sanitized := SanitizePayload(largePayload)
	if len(sanitized) > MaxEventPayloadBytes {
		t.Fatalf("expected payload <= %d bytes, got %d bytes", MaxEventPayloadBytes, len(sanitized))
	}

	var meta map[string]any
	if err := json.Unmarshal(sanitized, &meta); err != nil {
		t.Fatalf("failed to unmarshal truncated payload: %v", err)
	}

	if meta["__truncated"] != true {
		t.Errorf("expected __truncated to be true")
	}
}
