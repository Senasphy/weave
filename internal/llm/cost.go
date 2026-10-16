package llm

import (
	"strings"
)

// ModelPrice defines rates per million tokens.
type ModelPrice struct {
	InputPerMTok  float64 `json:"input_per_mtok"`
	OutputPerMTok float64 `json:"output_per_mtok"`
}

// DefaultModelPriceTable holds versioned prices per million tokens.
// Updated for modern 2026 frontier LLMs across OpenAI, Anthropic, Google Gemini, and Mock.
var DefaultModelPriceTable = map[string]ModelPrice{
	// OpenAI GPT-6 & Frontier Reasoning Models (2025-2026)
	"openai:gpt-6.1-sol":                      {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"openai:gpt-6.1":                          {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"openai:gpt-6-astra":                      {InputPerMTok: 10.00, OutputPerMTok: 50.00},
	"openai:gpt-6-sol":                        {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"openai:gpt-6-luna":                       {InputPerMTok: 0.10, OutputPerMTok: 0.50},
	"openai:gpt-6":                            {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"openai:gpt-5":                            {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"openai:o3":                               {InputPerMTok: 2.00, OutputPerMTok: 8.00},
	"openai:o3-mini":                          {InputPerMTok: 0.55, OutputPerMTok: 2.20},
	"openai:o4-mini":                          {InputPerMTok: 0.55, OutputPerMTok: 2.20},
	"openai:o1":                               {InputPerMTok: 15.00, OutputPerMTok: 60.00},
	"openai:o1-mini":                          {InputPerMTok: 1.10, OutputPerMTok: 4.40},
	"openai:gpt-4o":                           {InputPerMTok: 2.50, OutputPerMTok: 10.00},
	"openai:gpt-4o-mini":                      {InputPerMTok: 0.15, OutputPerMTok: 0.60},

	// Anthropic Claude 5.5 & Frontier Models (2025-2026)
	"anthropic:claude-opus-5-5":               {InputPerMTok: 4.00, OutputPerMTok: 20.00},
	"anthropic:opus-5.5":                      {InputPerMTok: 4.00, OutputPerMTok: 20.00},
	"anthropic:claude-5-5-opus":               {InputPerMTok: 4.00, OutputPerMTok: 20.00},
	"anthropic:claude-sonnet-5-5":             {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"anthropic:sonnet-5.5":                    {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"anthropic:claude-5-5-sonnet":             {InputPerMTok: 2.00, OutputPerMTok: 10.00},
	"anthropic:claude-haiku-5-5":              {InputPerMTok: 0.50, OutputPerMTok: 2.50},
	"anthropic:haiku-5.5":                     {InputPerMTok: 0.50, OutputPerMTok: 2.50},
	"anthropic:claude-4-opus":                 {InputPerMTok: 5.00, OutputPerMTok: 25.00},
	"anthropic:claude-4-sonnet":               {InputPerMTok: 3.00, OutputPerMTok: 15.00},
	"anthropic:claude-3-7-sonnet":             {InputPerMTok: 3.00, OutputPerMTok: 15.00},
	"anthropic:claude-3-5-sonnet":             {InputPerMTok: 3.00, OutputPerMTok: 15.00},
	"anthropic:claude-3-5-sonnet-20241022":    {InputPerMTok: 3.00, OutputPerMTok: 15.00},
	"anthropic:claude-3-5-haiku":              {InputPerMTok: 0.80, OutputPerMTok: 4.00},
	"anthropic:claude-3-5-haiku-20241022":     {InputPerMTok: 0.80, OutputPerMTok: 4.00},

	// Google Gemini Frontier Models (2025-2026)
	"gemini:gemini-3.8-flash":                 {InputPerMTok: 0.75, OutputPerMTok: 3.75},
	"gemini:gemini-3.7-flash":                 {InputPerMTok: 0.75, OutputPerMTok: 3.75},
	"gemini:gemini-3.1-pro":                   {InputPerMTok: 2.00, OutputPerMTok: 12.00},
	"gemini:gemini-3.1-flash-lite":            {InputPerMTok: 0.25, OutputPerMTok: 1.50},
	"gemini:gemini-2.5-pro":                   {InputPerMTok: 1.25, OutputPerMTok: 10.00},
	"gemini:gemini-2.5-flash":                 {InputPerMTok: 0.30, OutputPerMTok: 2.50},

	// Deterministic Mock for Testing & Offline Execution
	"mock:mock-llm":                           {InputPerMTok: 0.00, OutputPerMTok: 0.00},
	"mock:mock":                               {InputPerMTok: 0.00, OutputPerMTok: 0.00},
}

// KnownModelKeys returns a lookup set of all known model keys (provider:model) for graph validation.
func KnownModelKeys() map[string]bool {
	m := make(map[string]bool, len(DefaultModelPriceTable))
	for k := range DefaultModelPriceTable {
		m[k] = true
	}
	return m
}

// CalculateCost calculates estimated USD cost from token counts.
func CalculateCost(provider, model string, inputTokens, outputTokens int) float64 {
	key := strings.ToLower(provider) + ":" + strings.ToLower(model)
	price, ok := DefaultModelPriceTable[key]
	if !ok {
		return 0.0
	}
	inputCost := (float64(inputTokens) / 1_000_000.0) * price.InputPerMTok
	outputCost := (float64(outputTokens) / 1_000_000.0) * price.OutputPerMTok
	return inputCost + outputCost
}
