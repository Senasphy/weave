package graph

import (
	"encoding/json"
	"fmt"
	"strings"
)

const (
	MaxNodesMVP = 50
	MaxEdgesMVP = 100
)

// Validate runs all semantic and structural rules against a WorkflowGraph.
func Validate(g *WorkflowGraph, cfg *WorkspaceConfig) []Diagnostic {
	var diags []Diagnostic

	if g == nil {
		return []Diagnostic{{
			Severity: SeverityError,
			Code:     "nil_graph",
			Message:  "workflow graph cannot be nil",
		}}
	}

	if cfg == nil {
		cfg = &WorkspaceConfig{
			AllowedTools:              make(map[string]ToolDeclaration),
			KnownModelPrices:          make(map[string]bool),
			RequireGateForSideEffects: true,
		}
	}

	// 1. Basic properties
	if g.SchemaVersion != "1" {
		diags = append(diags, Diagnostic{
			Severity:    SeverityError,
			Code:        "invalid_schema_version",
			Message:     fmt.Sprintf("unsupported schema version '%s', expected '1'", g.SchemaVersion),
			JSONPointer: "/schema_version",
		})
	}
	if strings.TrimSpace(g.Name) == "" {
		diags = append(diags, Diagnostic{
			Severity:    SeverityError,
			Code:        "missing_name",
			Message:     "workflow name is required",
			JSONPointer: "/name",
		})
	}

	// 2. Budgets check
	mergedBudgets := mergeBudgets(g.Budgets, g.DefaultsBudgets(), &cfg.DefaultBudgets)
	if mergedBudgets.MaxWallSeconds <= 0 {
		diags = append(diags, Diagnostic{
			Severity:    SeverityError,
			Code:        "missing_wall_clock_budget",
			Message:     "workflow must specify max_wall_seconds in graph budgets or workspace defaults",
			JSONPointer: "/budgets/max_wall_seconds",
		})
	}
	if mergedBudgets.MaxCostUSD <= 0 && mergedBudgets.MaxTokens <= 0 {
		diags = append(diags, Diagnostic{
			Severity:    SeverityError,
			Code:        "missing_cost_or_token_budget",
			Message:     "workflow must specify max_cost_usd or max_tokens in graph budgets or workspace defaults",
			JSONPointer: "/budgets",
		})
	}

	// 3. Node & Edge counts
	if len(g.Nodes) == 0 {
		diags = append(diags, Diagnostic{
			Severity:    SeverityError,
			Code:        "no_nodes",
			Message:     "workflow must contain at least one node",
			JSONPointer: "/nodes",
		})
		return diags
	}
	if len(g.Nodes) > MaxNodesMVP {
		diags = append(diags, Diagnostic{
			Severity:    SeverityError,
			Code:        "exceeded_node_limit",
			Message:     fmt.Sprintf("node count %d exceeds MVP limit of %d", len(g.Nodes), MaxNodesMVP),
			JSONPointer: "/nodes",
		})
	}
	if len(g.Edges) > MaxEdgesMVP {
		diags = append(diags, Diagnostic{
			Severity:    SeverityError,
			Code:        "exceeded_edge_limit",
			Message:     fmt.Sprintf("edge count %d exceeds MVP limit of %d", len(g.Edges), MaxEdgesMVP),
			JSONPointer: "/edges",
		})
	}

	// 4. Node map and uniqueness
	nodeMap := make(map[string]*Node)
	nodeIndices := make(map[string]int)
	for i := range g.Nodes {
		n := &g.Nodes[i]
		if n.ID == "" {
			diags = append(diags, Diagnostic{
				Severity:    SeverityError,
				Code:        "empty_node_id",
				Message:     fmt.Sprintf("node at index %d has empty ID", i),
				JSONPointer: fmt.Sprintf("/nodes/%d/id", i),
			})
			continue
		}
		if _, exists := nodeMap[n.ID]; exists {
			diags = append(diags, Diagnostic{
				Severity:    SeverityError,
				Code:        "duplicate_node_id",
				Message:     fmt.Sprintf("duplicate node ID '%s'", n.ID),
				NodeID:      n.ID,
				JSONPointer: fmt.Sprintf("/nodes/%d/id", i),
			})
		}
		nodeMap[n.ID] = n
		nodeIndices[n.ID] = i
	}

	// 5. State declaration map
	stateDecls := g.State
	if stateDecls == nil {
		stateDecls = make(map[string]StateDeclaration)
	}

	// 6. Inspect individual nodes
	for i := range g.Nodes {
		n := &g.Nodes[i]
		nodePtr := fmt.Sprintf("/nodes/%d", i)

		switch n.Type {
		case NodeTypeAgent:
			// Agent must have output_schema
			if len(n.OutputSchema) == 0 || string(n.OutputSchema) == "{}" || string(n.OutputSchema) == "null" {
				diags = append(diags, Diagnostic{
					Severity:    SeverityError,
					Code:        "agent_missing_output_schema",
					Message:     fmt.Sprintf("agent node '%s' must declare a non-empty output_schema", n.ID),
					NodeID:      n.ID,
					JSONPointer: nodePtr + "/output_schema",
				})
			} else {
				// Validate that output_schema is valid JSON
				var testJSON any
				if err := json.Unmarshal(n.OutputSchema, &testJSON); err != nil {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "invalid_output_schema_json",
						Message:     fmt.Sprintf("agent '%s' output_schema is not valid JSON: %v", n.ID, err),
						NodeID:      n.ID,
						JSONPointer: nodePtr + "/output_schema",
					})
				}
			}

			// Validate input_schema if provided
			if len(n.InputSchema) > 0 {
				var testJSON any
				if err := json.Unmarshal(n.InputSchema, &testJSON); err != nil {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "invalid_input_schema_json",
						Message:     fmt.Sprintf("agent '%s' input_schema is not valid JSON: %v", n.ID, err),
						NodeID:      n.ID,
						JSONPointer: nodePtr + "/input_schema",
					})
				}
			}

			// Model configuration
			if n.Model == nil || n.Model.Provider == "" || n.Model.Name == "" {
				diags = append(diags, Diagnostic{
					Severity:    SeverityError,
					Code:        "agent_missing_model",
					Message:     fmt.Sprintf("agent node '%s' must declare model provider and name", n.ID),
					NodeID:      n.ID,
					JSONPointer: nodePtr + "/model",
				})
			} else if len(cfg.KnownModelPrices) > 0 {
				modelKey := fmt.Sprintf("%s:%s", strings.ToLower(n.Model.Provider), strings.ToLower(n.Model.Name))
				if !cfg.KnownModelPrices[modelKey] && n.Model.Provider != "mock" {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "unknown_model_price",
						Message:     fmt.Sprintf("agent node '%s' uses model '%s/%s' with no known price entry", n.ID, n.Model.Provider, n.Model.Name),
						NodeID:      n.ID,
						JSONPointer: nodePtr + "/model",
					})
				}
			}

			// Tools validation
			for _, toolID := range n.Tools {
				toolDecl, exists := cfg.AllowedTools[toolID]
				if !exists && len(cfg.AllowedTools) > 0 {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "unknown_tool",
						Message:     fmt.Sprintf("agent node '%s' references undeclared tool '%s'", n.ID, toolID),
						NodeID:      n.ID,
						JSONPointer: nodePtr + "/tools",
					})
				} else if exists && toolDecl.SideEffects {
					if n.Permissions == nil || !n.Permissions.SideEffects {
						diags = append(diags, Diagnostic{
							Severity:    SeverityError,
							Code:        "missing_side_effects_permission",
							Message:     fmt.Sprintf("agent node '%s' uses side-effect tool '%s' but lacks permissions.side_effects: true", n.ID, toolID),
							NodeID:      n.ID,
							JSONPointer: nodePtr + "/permissions",
						})
					}
				}
			}

			// Reads / Writes state checks
			for _, key := range n.Reads {
				if _, ok := stateDecls[key]; !ok {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "undeclared_state_read",
						Message:     fmt.Sprintf("agent '%s' reads undeclared state key '%s'", n.ID, key),
						NodeID:      n.ID,
						JSONPointer: nodePtr + "/reads",
					})
				}
			}
			for _, key := range n.Writes {
				if _, ok := stateDecls[key]; !ok {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "undeclared_state_write",
						Message:     fmt.Sprintf("agent '%s' writes undeclared state key '%s'", n.ID, key),
						NodeID:      n.ID,
						JSONPointer: nodePtr + "/writes",
					})
				}
			}

			// Warnings for prompt length
			if len(n.SystemPrompt) > 4000 {
				diags = append(diags, Diagnostic{
					Severity:    SeverityWarning,
					Code:        "long_system_prompt",
					Message:     fmt.Sprintf("agent '%s' has a very long system prompt (%d chars)", n.ID, len(n.SystemPrompt)),
					NodeID:      n.ID,
					JSONPointer: nodePtr + "/system_prompt",
				})
			}
			if len(n.Tools) == 0 && len(strings.TrimSpace(n.SystemPrompt)) < 10 {
				diags = append(diags, Diagnostic{
					Severity:    SeverityWarning,
					Code:        "trivial_agent",
					Message:     fmt.Sprintf("agent '%s' has no tools and a trivial system prompt", n.ID),
					NodeID:      n.ID,
					JSONPointer: nodePtr + "/system_prompt",
				})
			}

		case NodeTypeGate:
			if strings.TrimSpace(n.Prompt) == "" {
				diags = append(diags, Diagnostic{
					Severity:    SeverityError,
					Code:        "gate_missing_prompt",
					Message:     fmt.Sprintf("gate node '%s' must specify a prompt for the human reviewer", n.ID),
					NodeID:      n.ID,
					JSONPointer: nodePtr + "/prompt",
				})
			}
			if n.OnTimeout != "" && n.OnTimeout != "fail" && n.OnTimeout != "reject" {
				diags = append(diags, Diagnostic{
					Severity:    SeverityError,
					Code:        "invalid_gate_on_timeout",
					Message:     fmt.Sprintf("gate '%s' on_timeout must be 'fail' or 'reject', got '%s'", n.ID, n.OnTimeout),
					NodeID:      n.ID,
					JSONPointer: nodePtr + "/on_timeout",
				})
			}

		case NodeTypeRouter:
			// Router-specific checks will be done with edge checks

		case NodeTypeFanOut:
			// Fan out checks

		case NodeTypeJoin:
			// Join checks
		}
	}

	// 7. Edge validation & CEL compiler
	celCompiler, err := NewCELCompiler()
	if err != nil {
		diags = append(diags, Diagnostic{
			Severity: SeverityError,
			Code:     "cel_init_error",
			Message:  fmt.Sprintf("failed to initialize CEL engine: %v", err),
		})
	}

	edgeMap := make(map[string]*Edge)
	outgoingEdges := make(map[string][]*Edge)
	incomingEdges := make(map[string][]*Edge)

	for i := range g.Edges {
		e := &g.Edges[i]
		edgePtr := fmt.Sprintf("/edges/%d", i)

		if e.ID == "" {
			diags = append(diags, Diagnostic{
				Severity:    SeverityError,
				Code:        "empty_edge_id",
				Message:     fmt.Sprintf("edge at index %d has empty ID", i),
				JSONPointer: edgePtr + "/id",
			})
			continue
		}
		if _, exists := edgeMap[e.ID]; exists {
			diags = append(diags, Diagnostic{
				Severity:    SeverityError,
				Code:        "duplicate_edge_id",
				Message:     fmt.Sprintf("duplicate edge ID '%s'", e.ID),
				EdgeID:      e.ID,
				JSONPointer: edgePtr + "/id",
			})
		}
		edgeMap[e.ID] = e

		fromNode, fromExists := nodeMap[e.From]
		_, toExists := nodeMap[e.To]

		if !fromExists {
			diags = append(diags, Diagnostic{
				Severity:    SeverityError,
				Code:        "edge_from_unknown",
				Message:     fmt.Sprintf("edge '%s' references unknown source node '%s'", e.ID, e.From),
				EdgeID:      e.ID,
				JSONPointer: edgePtr + "/from",
			})
		}
		if !toExists {
			diags = append(diags, Diagnostic{
				Severity:    SeverityError,
				Code:        "edge_to_unknown",
				Message:     fmt.Sprintf("edge '%s' references unknown target node '%s'", e.ID, e.To),
				EdgeID:      e.ID,
				JSONPointer: edgePtr + "/to",
			})
		}

		if fromExists && toExists {
			outgoingEdges[e.From] = append(outgoingEdges[e.From], e)
			incomingEdges[e.To] = append(incomingEdges[e.To], e)
		}

		// CEL condition validation
		if e.Kind == EdgeKindWhen {
			if strings.TrimSpace(e.Expr) == "" {
				diags = append(diags, Diagnostic{
					Severity:    SeverityError,
					Code:        "missing_when_expression",
					Message:     fmt.Sprintf("edge '%s' has kind 'when' but missing expr", e.ID),
					EdgeID:      e.ID,
					JSONPointer: edgePtr + "/expr",
				})
			} else if celCompiler != nil {
				if _, err := celCompiler.CompileCondition(e.Expr); err != nil {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "invalid_cel_expression",
						Message:     fmt.Sprintf("edge '%s' expr error: %v", e.ID, err),
						EdgeID:      e.ID,
						JSONPointer: edgePtr + "/expr",
					})
				}
			}
		}

		// CEL mapping validation
		if e.Map != nil && strings.TrimSpace(e.Map.ToInput) != "" {
			if celCompiler != nil {
				if _, err := celCompiler.CompileMapping(e.Map.ToInput); err != nil {
					diags = append(diags, Diagnostic{
						Severity:    SeverityError,
						Code:        "invalid_cel_mapping",
						Message:     fmt.Sprintf("edge '%s' map.to_input error: %v", e.ID, err),
						EdgeID:      e.ID,
						JSONPointer: edgePtr + "/map/to_input",
					})
				}
			}
		}

		// Self-loop validation
		if e.From == e.To && e.MaxTraversals <= 0 {
			diags = append(diags, Diagnostic{
				Severity:    SeverityError,
				Code:        "unbounded_self_loop",
				Message:     fmt.Sprintf("self loop edge '%s' on node '%s' must specify max_traversals", e.ID, e.From),
				EdgeID:      e.ID,
				NodeID:      e.From,
				JSONPointer: edgePtr + "/max_traversals",
			})
		}

		// Router specific check for outgoing edge
		if fromExists && fromNode.Type == NodeTypeRouter {
			if e.Kind != EdgeKindWhen && e.Kind != EdgeKindDefault && e.Kind != EdgeKindAlways {
				diags = append(diags, Diagnostic{
					Severity:    SeverityError,
					Code:        "invalid_router_edge_kind",
					Message:     fmt.Sprintf("router node '%s' edge '%s' kind must be 'when', 'default', or 'always'", fromNode.ID, e.ID),
					EdgeID:      e.ID,
					NodeID:      fromNode.ID,
					JSONPointer: edgePtr + "/kind",
				})
			}
		}
	}

	// 8. Router default edge check
	for _, n := range g.Nodes {
		if n.Type == NodeTypeRouter {
			outs := outgoingEdges[n.ID]
			if len(outs) == 0 {
				diags = append(diags, Diagnostic{
					Severity: SeverityError,
					Code:     "router_no_outgoing_edges",
					Message:  fmt.Sprintf("router node '%s' has no outgoing edges", n.ID),
					NodeID:   n.ID,
				})
			} else {
				hasDefaultOrAlways := false
				for _, outEdge := range outs {
					if outEdge.Kind == EdgeKindDefault || outEdge.Kind == EdgeKindAlways {
						hasDefaultOrAlways = true
						break
					}
				}
				if !hasDefaultOrAlways {
					diags = append(diags, Diagnostic{
						Severity: SeverityError,
						Code:     "router_missing_default_edge",
						Message:  fmt.Sprintf("router node '%s' must have an 'always' or 'default' edge as fallback", n.ID),
						NodeID:   n.ID,
					})
				}
			}
		}
	}

	// 9. Fan-out / Join check
	fanOutNodes := make(map[string]bool)
	joinNodes := make(map[string]bool)
	for _, n := range g.Nodes {
		if n.Type == NodeTypeFanOut {
			fanOutNodes[n.ID] = true
			if len(outgoingEdges[n.ID]) > 5 {
				diags = append(diags, Diagnostic{
					Severity: SeverityWarning,
					Code:     "high_fan_out",
					Message:  fmt.Sprintf("fan-out node '%s' has %d branches (warning > 5)", n.ID, len(outgoingEdges[n.ID])),
					NodeID:   n.ID,
				})
			}
		}
		if n.Type == NodeTypeJoin {
			joinNodes[n.ID] = true
		}
	}
	if len(fanOutNodes) > 0 && len(joinNodes) == 0 {
		diags = append(diags, Diagnostic{
			Severity: SeverityError,
			Code:     "fan_out_without_join",
			Message:  "workflow contains fan_out nodes without any join node",
		})
	}

	// 10. Entry node detection & uniqueness
	var entryNodes []string
	for _, n := range g.Nodes {
		if n.IsEntry {
			entryNodes = append(entryNodes, n.ID)
		} else {
			// Check if it has 0 incoming non-failure edges
			incomings := incomingEdges[n.ID]
			nonFailureIncomings := 0
			for _, inEdge := range incomings {
				if inEdge.Kind != EdgeKindOnFailure {
					nonFailureIncomings++
				}
			}
			if nonFailureIncomings == 0 && len(incomings) == 0 {
				entryNodes = append(entryNodes, n.ID)
			}
		}
	}

	// Deduplicate entries
	entryMap := make(map[string]bool)
	var uniqueEntries []string
	for _, id := range entryNodes {
		if !entryMap[id] {
			entryMap[id] = true
			uniqueEntries = append(uniqueEntries, id)
		}
	}

	if len(uniqueEntries) == 0 {
		diags = append(diags, Diagnostic{
			Severity: SeverityError,
			Code:     "no_entry_node",
			Message:  "workflow has no entry node (mark one with is_entry: true)",
		})
		return diags
	}
	if len(uniqueEntries) > 1 {
		diags = append(diags, Diagnostic{
			Severity: SeverityError,
			Code:     "multiple_entry_nodes",
			Message:  fmt.Sprintf("workflow has %d unmarked entry nodes (%s); specify exactly one entry or connect them", len(uniqueEntries), strings.Join(uniqueEntries, ", ")),
		})
	}

	primaryEntry := uniqueEntries[0]

	// 11. Reachability analysis from entry node
	reachable := make(map[string]bool)
	var queue []string
	reachable[primaryEntry] = true
	queue = append(queue, primaryEntry)

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]

		for _, outEdge := range outgoingEdges[curr] {
			target := outEdge.To
			if !reachable[target] {
				reachable[target] = true
				queue = append(queue, target)
			}
		}
	}

	for _, n := range g.Nodes {
		if !reachable[n.ID] {
			diags = append(diags, Diagnostic{
				Severity: SeverityError,
				Code:     "unreachable_node",
				Message:  fmt.Sprintf("node '%s' is unreachable from entry node '%s'", n.ID, primaryEntry),
				NodeID:   n.ID,
			})
		}
	}

	// 12. Cycle detection and max_traversals verification
	// We want to detect all directed cycles in the graph.
	// If any cycle has no edge with max_traversals > 0, report an error.
	findUnboundedCycles(g, outgoingEdges, &diags)

	// 13. Side-effect tool reachable without gate upstream
	if cfg.RequireGateForSideEffects {
		checkSideEffectsGating(g, outgoingEdges, primaryEntry, cfg, &diags)
	}

	// 14. Parallel writers with overwrite reducer
	checkParallelOverwriteConflicts(g, outgoingEdges, stateDecls, &diags)

	return diags
}

// Helper: merge budgets hierarchy (explicit graph > graph defaults > workspace defaults)
func mergeBudgets(explicit *Budgets, defaults *Budgets, wsDefaults *Budgets) Budgets {
	b := Budgets{}
	if wsDefaults != nil {
		b = *wsDefaults
	}
	if defaults != nil {
		if defaults.MaxSteps > 0 {
			b.MaxSteps = defaults.MaxSteps
		}
		if defaults.MaxTokens > 0 {
			b.MaxTokens = defaults.MaxTokens
		}
		if defaults.MaxCostUSD > 0 {
			b.MaxCostUSD = defaults.MaxCostUSD
		}
		if defaults.MaxWallSeconds > 0 {
			b.MaxWallSeconds = defaults.MaxWallSeconds
		}
		if defaults.MaxTurns > 0 {
			b.MaxTurns = defaults.MaxTurns
		}
	}
	if explicit != nil {
		if explicit.MaxSteps > 0 {
			b.MaxSteps = explicit.MaxSteps
		}
		if explicit.MaxTokens > 0 {
			b.MaxTokens = explicit.MaxTokens
		}
		if explicit.MaxCostUSD > 0 {
			b.MaxCostUSD = explicit.MaxCostUSD
		}
		if explicit.MaxWallSeconds > 0 {
			b.MaxWallSeconds = explicit.MaxWallSeconds
		}
		if explicit.MaxTurns > 0 {
			b.MaxTurns = explicit.MaxTurns
		}
	}
	return b
}

func (g *WorkflowGraph) DefaultsBudgets() *Budgets {
	if g.Defaults != nil {
		return g.Defaults.Budgets
	}
	return nil
}

// findUnboundedCycles searches for cycles in the graph using DFS with back-edge detection.
func findUnboundedCycles(g *WorkflowGraph, outgoingEdges map[string][]*Edge, diags *[]Diagnostic) {
	// 0: unvisited, 1: visiting, 2: visited
	state := make(map[string]int)
	pathEdges := make([]*Edge, 0)
	cycleFound := make(map[string]bool)

	var dfs func(u string)
	dfs = func(u string) {
		state[u] = 1
		for _, e := range outgoingEdges[u] {
			v := e.To
			pathEdges = append(pathEdges, e)
			if state[v] == 1 {
				// Cycle detected: from v to u, ending with edge e
				// Extract the edges forming the cycle
				cycleEdges := extractCycleEdges(pathEdges, v)
				hasBoundedEdge := false
				for _, ce := range cycleEdges {
					if ce.MaxTraversals > 0 {
						hasBoundedEdge = true
						break
					}
				}
				if !hasBoundedEdge {
					cycleKey := fmt.Sprintf("%s->%s", u, v)
					if !cycleFound[cycleKey] {
						cycleFound[cycleKey] = true
						*diags = append(*diags, Diagnostic{
							Severity: SeverityError,
							Code:     "unbounded_cycle",
							Message:  fmt.Sprintf("unbounded cycle detected involving node '%s'; at least one edge in the cycle must declare max_traversals", v),
							NodeID:   v,
							EdgeID:   e.ID,
						})
					}
				}
			} else if state[v] == 0 {
				dfs(v)
			}
			pathEdges = pathEdges[:len(pathEdges)-1]
		}
		state[u] = 2
	}

	for _, n := range g.Nodes {
		if state[n.ID] == 0 {
			dfs(n.ID)
		}
	}
}

func extractCycleEdges(path []*Edge, startNode string) []*Edge {
	idx := -1
	for i := len(path) - 1; i >= 0; i-- {
		if path[i].From == startNode {
			idx = i
			break
		}
	}
	if idx >= 0 {
		return path[idx:]
	}
	return path
}

// checkSideEffectsGating ensures that any agent with side-effect tools has a gate node upstream on paths from entry.
func checkSideEffectsGating(g *WorkflowGraph, outgoingEdges map[string][]*Edge, entryNode string, cfg *WorkspaceConfig, diags *[]Diagnostic) {
	nodeMap := make(map[string]*Node)
	for i := range g.Nodes {
		nodeMap[g.Nodes[i].ID] = &g.Nodes[i]
	}

	// BFS/DFS tracking if a path from entry to node has passed a gate
	type pathState struct {
		nodeID    string
		hasGate   bool
	}

	// Find all agents with side-effecting tools
	sideEffectNodes := make(map[string]bool)
	for _, n := range g.Nodes {
		if n.Type == NodeTypeAgent {
			for _, toolID := range n.Tools {
				if t, ok := cfg.AllowedTools[toolID]; ok && t.SideEffects {
					sideEffectNodes[n.ID] = true
					break
				}
			}
		}
	}

	if len(sideEffectNodes) == 0 {
		return
	}

	// Explore paths from entry with no gate
	visitedWithoutGate := make(map[string]bool)
	var q []string
	q = append(q, entryNode)
	visitedWithoutGate[entryNode] = true

	for len(q) > 0 {
		currID := q[0]
		q = q[1:]

		currNode := nodeMap[currID]
		if currNode == nil {
			continue
		}

		// If current node has side effects and was reached without a gate:
		if sideEffectNodes[currID] {
			*diags = append(*diags, Diagnostic{
				Severity: SeverityError,
				Code:     "side_effect_without_gate",
				Message:  fmt.Sprintf("agent '%s' executes side-effecting tools but is reachable from entry without a human gate", currID),
				NodeID:   currID,
			})
			// Mark it checked so we don't duplicate diagnostic
			delete(sideEffectNodes, currID)
		}

		// If this node is a gate, paths continuing through here now have a gate,
		// so do not propagate ungated path.
		if currNode.Type == NodeTypeGate {
			continue
		}

		for _, out := range outgoingEdges[currID] {
			if !visitedWithoutGate[out.To] {
				visitedWithoutGate[out.To] = true
				q = append(q, out.To)
			}
		}
	}
}

// checkParallelOverwriteConflicts flags parallel branches (e.g. from fan-out) that write to the same key with 'overwrite' reducer.
func checkParallelOverwriteConflicts(g *WorkflowGraph, outgoingEdges map[string][]*Edge, stateDecls map[string]StateDeclaration, diags *[]Diagnostic) {
	for _, n := range g.Nodes {
		if n.Type == NodeTypeFanOut {
			// Find all nodes reachable on each branch before a join
			outs := outgoingEdges[n.ID]
			if len(outs) < 2 {
				continue
			}

			// Map key -> branchIndex
			keyWriters := make(map[string]map[int][]string) // key -> branchIdx -> []nodeID

			for branchIdx, outEdge := range outs {
				branchNodes := getBranchNodesBeforeJoin(g, outgoingEdges, outEdge.To)
				for _, bNodeID := range branchNodes {
					var bNode *Node
					for i := range g.Nodes {
						if g.Nodes[i].ID == bNodeID {
							bNode = &g.Nodes[i]
							break
						}
					}
					if bNode != nil {
						for _, wKey := range bNode.Writes {
							if decl, ok := stateDecls[wKey]; ok && decl.Reducer == ReducerOverwrite {
								if keyWriters[wKey] == nil {
									keyWriters[wKey] = make(map[int][]string)
								}
								keyWriters[wKey][branchIdx] = append(keyWriters[wKey][branchIdx], bNode.ID)
							}
						}
					}
				}
			}

			// Check for conflicts
			for key, branches := range keyWriters {
				if len(branches) > 1 {
					var conflictingNodes []string
					for _, nodes := range branches {
						conflictingNodes = append(conflictingNodes, nodes...)
					}
					*diags = append(*diags, Diagnostic{
						Severity: SeverityError,
						Code:     "parallel_overwrite_conflict",
						Message:  fmt.Sprintf("parallel branches from fan-out '%s' concurrently write to state key '%s' with 'overwrite' reducer (nodes: %s)", n.ID, key, strings.Join(conflictingNodes, ", ")),
						NodeID:   n.ID,
					})
				}
			}
		}
	}
}

func getBranchNodesBeforeJoin(g *WorkflowGraph, outgoingEdges map[string][]*Edge, startNode string) []string {
	visited := make(map[string]bool)
	var result []string
	var q []string

	nodeMap := make(map[string]*Node)
	for i := range g.Nodes {
		nodeMap[g.Nodes[i].ID] = &g.Nodes[i]
	}

	q = append(q, startNode)
	visited[startNode] = true

	for len(q) > 0 {
		currID := q[0]
		q = q[1:]

		n := nodeMap[currID]
		if n == nil || n.Type == NodeTypeJoin {
			continue
		}

		result = append(result, currID)

		for _, e := range outgoingEdges[currID] {
			if !visited[e.To] {
				visited[e.To] = true
				q = append(q, e.To)
			}
		}
	}

	return result
}
