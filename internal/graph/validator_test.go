package graph

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func loadWorkflowFile(t *testing.T, relPath string) *WorkflowGraph {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", relPath))
	if err != nil {
		t.Fatalf("failed to read fixture %s: %v", relPath, err)
	}
	var g WorkflowGraph
	if err := json.Unmarshal(data, &g); err != nil {
		t.Fatalf("failed to unmarshal fixture %s: %v", relPath, err)
	}
	return &g
}

func testWorkspaceConfig() *WorkspaceConfig {
	return &WorkspaceConfig{
		AllowedTools: map[string]ToolDeclaration{
			"kb_search":       {ID: "kb_search", Kind: "builtin", SideEffects: false},
			"stripe_refund":   {ID: "stripe_refund", Kind: "http", SideEffects: true},
			"dangerous_tool":  {ID: "dangerous_tool", Kind: "http", SideEffects: true},
		},
		KnownModelPrices: map[string]bool{
			"mock:mock-llm": true,
			"mock:mock":     true,
		},
		RequireGateForSideEffects: true,
		DefaultBudgets: Budgets{
			MaxWallSeconds: 300,
			MaxCostUSD:     1.0,
		},
	}
}

func hasErrorCode(diags []Diagnostic, code string) bool {
	for _, d := range diags {
		if d.Severity == SeverityError && d.Code == code {
			return true
		}
	}
	return false
}

func TestValidate_ValidTriage(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/valid_triage.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	var errors []Diagnostic
	for _, d := range diags {
		if d.Severity == SeverityError {
			errors = append(errors, d)
		}
	}

	if len(errors) > 0 {
		t.Fatalf("expected 0 errors for valid_triage.json, got %d: %+v", len(errors), errors)
	}
}

func TestValidate_UnboundedCycle(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/unbounded_cycle.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	if !hasErrorCode(diags, "unbounded_cycle") {
		t.Fatalf("expected error 'unbounded_cycle', got: %+v", diags)
	}
}

func TestValidate_MissingBudgets(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/missing_budgets.json")
	emptyCfg := &WorkspaceConfig{}
	diags := Validate(g, emptyCfg)

	if !hasErrorCode(diags, "missing_wall_clock_budget") {
		t.Fatalf("expected error 'missing_wall_clock_budget', got: %+v", diags)
	}
}

func TestValidate_UnreachableNode(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/unreachable_node.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	if !hasErrorCode(diags, "unreachable_node") {
		t.Fatalf("expected error 'unreachable_node', got: %+v", diags)
	}
}

func TestValidate_AgentMissingOutputSchema(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/agent_missing_output_schema.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	if !hasErrorCode(diags, "agent_missing_output_schema") {
		t.Fatalf("expected error 'agent_missing_output_schema', got: %+v", diags)
	}
}

func TestValidate_InvalidCEL(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/invalid_cel.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	if !hasErrorCode(diags, "invalid_cel_expression") {
		t.Fatalf("expected error 'invalid_cel_expression', got: %+v", diags)
	}
}

func TestValidate_SideEffectWithoutGate(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/side_effect_without_gate.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	if !hasErrorCode(diags, "side_effect_without_gate") {
		t.Fatalf("expected error 'side_effect_without_gate', got: %+v", diags)
	}
}

func TestValidate_ParallelOverwriteConflict(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/parallel_overwrite.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	if !hasErrorCode(diags, "parallel_overwrite_conflict") {
		t.Fatalf("expected error 'parallel_overwrite_conflict', got: %+v", diags)
	}
}

func TestValidate_RouterMissingDefault(t *testing.T) {
	g := loadWorkflowFile(t, "testdata/validator/router_missing_default.json")
	cfg := testWorkspaceConfig()
	diags := Validate(g, cfg)

	if !hasErrorCode(diags, "router_missing_default_edge") {
		t.Fatalf("expected error 'router_missing_default_edge', got: %+v", diags)
	}
}

func TestSemanticHash_InvarianceAndSensitivity(t *testing.T) {
	g1 := loadWorkflowFile(t, "testdata/validator/valid_triage.json")
	hash1, err := SemanticHash(g1)
	if err != nil {
		t.Fatalf("SemanticHash failed: %v", err)
	}

	// Change position and label (presentation fields)
	g2 := loadWorkflowFile(t, "testdata/validator/valid_triage.json")
	g2.Nodes[0].Position.X = 999
	g2.Nodes[0].Position.Y = 888
	g2.Nodes[0].Label = "A totally new presentation label"
	hash2, err := SemanticHash(g2)
	if err != nil {
		t.Fatalf("SemanticHash failed: %v", err)
	}

	if hash1 != hash2 {
		t.Fatalf("expected identical semantic hash across presentation changes, got %s != %s", hash1, hash2)
	}

	// Change semantic field: system prompt
	g3 := loadWorkflowFile(t, "testdata/validator/valid_triage.json")
	g3.Nodes[0].SystemPrompt = "Altered system prompt for triage"
	hash3, err := SemanticHash(g3)
	if err != nil {
		t.Fatalf("SemanticHash failed: %v", err)
	}

	if hash1 == hash3 {
		t.Fatalf("expected different semantic hash when semantic field changed, got %s == %s", hash1, hash3)
	}
}
