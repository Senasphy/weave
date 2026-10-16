package llm

import (
	"testing"
)

func TestCostCalculation(t *testing.T) {
	// gpt-4o: 2.50 / 1M in, 10.00 / 1M out
	// 1000 input tokens = 0.0025, 500 output tokens = 0.0050. Total = 0.0075
	cost := CalculateCost("openai", "gpt-4o", 1000, 500)
	expected := 0.0075
	if cost < expected-0.00001 || cost > expected+0.00001 {
		t.Fatalf("expected cost %.5f, got %.5f", expected, cost)
	}

	// o3: 2.00 / 1M in, 8.00 / 1M out
	// 1000 in = 0.002, 1000 out = 0.008 -> 0.010
	o3Cost := CalculateCost("openai", "o3", 1000, 1000)
	if o3Cost < 0.00999 || o3Cost > 0.01001 {
		t.Fatalf("expected o3 cost 0.010, got %f", o3Cost)
	}

	// claude-4-opus: 5.00 / 1M in, 25.00 / 1M out
	// 2000 in = 0.010, 1000 out = 0.025 -> 0.035
	claudeCost := CalculateCost("anthropic", "claude-4-opus", 2000, 1000)
	if claudeCost < 0.03499 || claudeCost > 0.03501 {
		t.Fatalf("expected claude-4-opus cost 0.035, got %f", claudeCost)
	}

	// gemini-3.8-flash: 0.75 / 1M in, 3.75 / 1M out
	// 4000 in = 0.003, 2000 out = 0.0075 -> 0.0105
	geminiCost := CalculateCost("gemini", "gemini-3.8-flash", 4000, 2000)
	if geminiCost < 0.01049 || geminiCost > 0.01051 {
		t.Fatalf("expected gemini-3.8-flash cost 0.0105, got %f", geminiCost)
	}

	// gpt-6.1-sol: 2.00 / 1M in, 10.00 / 1M out
	// 5000 in = 0.010, 1000 out = 0.010 -> 0.020
	gpt61Cost := CalculateCost("openai", "gpt-6.1-sol", 5000, 1000)
	if gpt61Cost < 0.01999 || gpt61Cost > 0.02001 {
		t.Fatalf("expected gpt-6.1-sol cost 0.020, got %f", gpt61Cost)
	}

	// opus-5.5: 4.00 / 1M in, 20.00 / 1M out
	// 1000 in = 0.004, 1000 out = 0.020 -> 0.024
	opus55Cost := CalculateCost("anthropic", "opus-5.5", 1000, 1000)
	if opus55Cost < 0.02399 || opus55Cost > 0.02401 {
		t.Fatalf("expected opus-5.5 cost 0.024, got %f", opus55Cost)
	}

	// mock model: 0.0 cost
	mockCost := CalculateCost("mock", "mock-llm", 10000, 10000)
	if mockCost != 0.0 {
		t.Fatalf("expected 0.0 cost for mock model, got %f", mockCost)
	}

	// KnownModelKeys verification
	keys := KnownModelKeys()
	if !keys["openai:gpt-6.1-sol"] || !keys["anthropic:opus-5.5"] || !keys["gemini:gemini-3.8-flash"] {
		t.Fatalf("expected gpt-6.1-sol and opus-5.5 to be in KnownModelKeys")
	}
}
