package tools

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"weave/internal/engine"
)

// ExecuteEcho echoes back arguments.
func ExecuteEcho(req engine.ToolRequest) (*engine.ToolResponse, error) {
	return &engine.ToolResponse{
		Output:  req.Arguments,
		CostUSD: 0.0,
	}, nil
}

// ExecuteCalculator evaluates basic arithmetic (+, -, *, /, sqrt, pow).
func ExecuteCalculator(req engine.ToolRequest) (*engine.ToolResponse, error) {
	op, _ := req.Arguments["operation"].(string)
	a, _ := toFloat(req.Arguments["a"])
	b, _ := toFloat(req.Arguments["b"])

	var res float64
	switch strings.ToLower(op) {
	case "add", "+":
		res = a + b
	case "subtract", "-":
		res = a - b
	case "multiply", "*":
		res = a * b
	case "divide", "/":
		if b == 0 {
			return nil, fmt.Errorf("division by zero")
		}
		res = a / b
	case "pow", "^":
		res = math.Pow(a, b)
	case "sqrt":
		if a < 0 {
			return nil, fmt.Errorf("square root of negative number")
		}
		res = math.Sqrt(a)
	default:
		return nil, fmt.Errorf("unknown calculator operation '%s'", op)
	}

	return &engine.ToolResponse{
		Output:  map[string]any{"result": res},
		CostUSD: 0.0,
	}, nil
}

func toFloat(val any) (float64, error) {
	switch v := val.(type) {
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, fmt.Errorf("cannot convert %T to float", val)
	}
}
