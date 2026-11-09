package redact

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

const (
	// MaxEventPayloadBytes is the maximum allowed size for an event payload in the audit log (64KB as per ADR-007).
	MaxEventPayloadBytes = 64 * 1024
)

var (
	// Matches ${secret:NAME} references
	secretPlaceholderRegex = regexp.MustCompile(`\$\{secret:[^}]+\}`)

	// Matches specific provider keys (order matters: more specific prefixes first)
	anthropicKeyRegex = regexp.MustCompile(`\bsk-ant-[a-zA-Z0-9_\-]{20,}\b`)
	openAIKeyRegex    = regexp.MustCompile(`\bsk-[a-zA-Z0-9_\-]{20,}\b`)
	geminiKeyRegex    = regexp.MustCompile(`\bAIzaSy[a-zA-Z0-9_\-]{30,45}\b`)
	githubTokenRegex  = regexp.MustCompile(`\b(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[a-zA-Z0-9_]{30,}\b`)
	slackTokenRegex   = regexp.MustCompile(`\bxox[baprs]-[a-zA-Z0-9_\-]{10,}\b`)
	bearerTokenRegex  = regexp.MustCompile(`(?i)\bBearer\s+[a-zA-Z0-9_\-\.]{20,}\b`)
)

// sensitiveKeyMap contains lower-cased JSON field names that should always have their values redacted.
var sensitiveKeyMap = map[string]bool{
	"password":       true,
	"secret":         true,
	"api_key":        true,
	"apikey":         true,
	"token":          true,
	"access_token":   true,
	"refresh_token":  true,
	"auth_token":     true,
	"authorization":  true,
	"private_key":    true,
	"client_secret":  true,
	"stripe_key":     true,
	"stripe_secret":  true,
	"webhook_secret": true,
}

// RedactString scrubs secret patterns and placeholders from a raw string.
func RedactString(s string) string {
	if s == "" {
		return s
	}

	// 1. Scrub ${secret:NAME} placeholders
	s = secretPlaceholderRegex.ReplaceAllString(s, "[REDACTED_SECRET]")

	// 2. Scrub specific provider keys (anthropic before openAI due to sk- prefix)
	s = anthropicKeyRegex.ReplaceAllString(s, "[REDACTED_ANTHROPIC_KEY]")
	s = openAIKeyRegex.ReplaceAllString(s, "[REDACTED_OPENAI_KEY]")
	s = geminiKeyRegex.ReplaceAllString(s, "[REDACTED_GOOGLE_KEY]")
	s = githubTokenRegex.ReplaceAllString(s, "[REDACTED_GITHUB_TOKEN]")
	s = slackTokenRegex.ReplaceAllString(s, "[REDACTED_SLACK_TOKEN]")
	s = bearerTokenRegex.ReplaceAllString(s, "Bearer [REDACTED]")

	return s
}

// RedactAny recursively inspects arbitrary Go data structures, redacting sensitive keys and string patterns.
func RedactAny(v any) any {
	switch val := v.(type) {
	case string:
		return RedactString(val)

	case map[string]any:
		cleaned := make(map[string]any, len(val))
		for k, item := range val {
			kLower := strings.ToLower(strings.TrimSpace(k))
			if sensitiveKeyMap[kLower] {
				cleaned[k] = "[REDACTED]"
			} else {
				cleaned[k] = RedactAny(item)
			}
		}
		return cleaned

	case []any:
		cleaned := make([]any, len(val))
		for i, item := range val {
			cleaned[i] = RedactAny(item)
		}
		return cleaned

	default:
		return val
	}
}

// TruncatePayload ensures that a JSON payload does not exceed maxBytes.
// If it does, it wraps the payload with truncation metadata while keeping a safe preview.
func TruncatePayload(payload json.RawMessage, maxBytes int) json.RawMessage {
	if len(payload) <= maxBytes {
		return payload
	}

	previewLen := maxBytes / 2
	if previewLen > 1024 {
		previewLen = 1024
	}

	preview := string(payload[:previewLen])
	truncatedObj := map[string]any{
		"__truncated":     true,
		"__original_size": len(payload),
		"__max_allowed":   maxBytes,
		"preview":         preview + "... [truncated]",
	}

	enc, err := json.Marshal(truncatedObj)
	if err != nil {
		return json.RawMessage(fmt.Sprintf(`{"__truncated":true,"__original_size":%d}`, len(payload)))
	}
	return enc
}

// SanitizePayload scrubs all secrets and enforces the 64KB size limit on an event payload.
func SanitizePayload(payload json.RawMessage) json.RawMessage {
	if len(payload) == 0 {
		return payload
	}

	var parsed any
	if err := json.Unmarshal(payload, &parsed); err != nil {
		// Not valid JSON object/array; treat as raw string if possible
		redactedStr := RedactString(string(payload))
		return TruncatePayload(json.RawMessage(redactedStr), MaxEventPayloadBytes)
	}

	redactedData := RedactAny(parsed)
	redactedBytes, err := json.Marshal(redactedData)
	if err != nil {
		return TruncatePayload(payload, MaxEventPayloadBytes)
	}

	return TruncatePayload(redactedBytes, MaxEventPayloadBytes)
}
