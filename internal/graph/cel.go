package graph

import (
	"fmt"

	"cel.dev/expr"
	"cel.dev/cel-go/cel"
)

// CELCompiler provides thread-safe compilation and evaluation of graph CEL expressions.
type CELCompiler struct {
	env *cel.Env
}

// NewCELCompiler creates a compiler with standard variables `out` and `state`.
func NewCELCompiler() (*CELCompiler, error) {
	env, err := cel.NewEnv(
		cel.Variable("out", cel.DynType),
		cel.Variable("state", cel.MapType(cel.StringType, cel.DynType)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create CEL env: %w", err)
	}
	return &CELCompiler{env: env}, nil
}

// CompileCondition compiles a boolean condition expression (for `when` edges).
func (c *CELCompiler) CompileCondition(expression string) (cel.Program, error) {
	ast, issues := c.env.Compile(expression)
	if issues != nil && issues.Err() != nil {
		return nil, fmt.Errorf("CEL syntax error: %w", issues.Err())
	}
	if ast.OutputType() != cel.BoolType && ast.OutputType() != cel.DynType {
		return nil, fmt.Errorf("expected boolean expression, got %s", ast.OutputType())
	}
	prg, err := c.env.Program(ast)
	if err != nil {
		return nil, fmt.Errorf("failed to create CEL program: %w", err)
	}
	return prg, nil
}

// CompileMapping compiles an input mapping expression.
func (c *CELCompiler) CompileMapping(expression string) (cel.Program, error) {
	ast, issues := c.env.Compile(expression)
	if issues != nil && issues.Err() != nil {
		return nil, fmt.Errorf("CEL syntax error: %w", issues.Err())
	}
	prg, err := c.env.Program(ast)
	if err != nil {
		return nil, fmt.Errorf("failed to create CEL program: %w", err)
	}
	return prg, nil
}

// EvaluateCondition evaluates a compiled boolean expression against source output and state.
func EvaluateCondition(prg cel.Program, out any, state map[string]any) (bool, error) {
	vars := map[string]any{
		"out":   out,
		"state": state,
	}
	res, _, err := prg.Eval(vars)
	if err != nil {
		return false, fmt.Errorf("CEL eval error: %w", err)
	}
	val := res.Value()
	b, ok := val.(bool)
	if !ok {
		return false, fmt.Errorf("CEL expression did not return boolean, got %T (%v)", val, val)
	}
	return b, nil
}

// EvaluateMapping evaluates a compiled mapping expression against source output and state.
func EvaluateMapping(prg cel.Program, out any, state map[string]any) (any, error) {
	vars := map[string]any{
		"out":   out,
		"state": state,
	}
	res, _, err := prg.Eval(vars)
	if err != nil {
		return nil, fmt.Errorf("CEL eval error: %w", err)
	}
	return res.Value(), nil
}

// Suppress unused import warning for cel.dev/expr if needed
var _ *expr.Expr = nil
