package graph

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
)

// SemanticHash computes a deterministic SHA-256 hash of the graph excluding presentation fields
// (such as node positions, labels, colors, and graph descriptions).
func SemanticHash(g *WorkflowGraph) (string, error) {
	type semanticNode struct {
		ID             string          `json:"id"`
		Type           NodeType        `json:"type"`
		IsEntry        bool            `json:"is_entry"`
		Model          *ModelConfig    `json:"model,omitempty"`
		SystemPrompt   string          `json:"system_prompt,omitempty"`
		Tools          []string        `json:"tools,omitempty"`
		InputSchema    json.RawMessage `json:"input_schema,omitempty"`
		OutputSchema   json.RawMessage `json:"output_schema,omitempty"`
		Reads          []string        `json:"reads,omitempty"`
		Writes         []string        `json:"writes,omitempty"`
		Budgets        *Budgets        `json:"budgets,omitempty"`
		Retry          *RetryPolicy    `json:"retry,omitempty"`
		Permissions    *Permissions    `json:"permissions,omitempty"`
		Prompt         string          `json:"prompt,omitempty"`
		AllowEdit      bool            `json:"allow_edit,omitempty"`
		TimeoutSeconds int             `json:"timeout_seconds,omitempty"`
		OnTimeout      string          `json:"on_timeout,omitempty"`
		RouterMode     RouterMode      `json:"router_mode,omitempty"`
		JoinPolicy     JoinPolicy      `json:"join_policy,omitempty"`
	}

	type semanticEdge struct {
		ID            string   `json:"id"`
		From          string   `json:"from"`
		To            string   `json:"to"`
		Kind          EdgeKind `json:"kind"`
		Expr          string   `json:"expr,omitempty"`
		Priority      int      `json:"priority,omitempty"`
		MaxTraversals int      `json:"max_traversals,omitempty"`
		Map           *EdgeMap `json:"map,omitempty"`
	}

	nodes := make([]semanticNode, len(g.Nodes))
	for i, n := range g.Nodes {
		var tools []string
		if len(n.Tools) > 0 {
			tools = append([]string(nil), n.Tools...)
			sort.Strings(tools)
		}
		var reads []string
		if len(n.Reads) > 0 {
			reads = append([]string(nil), n.Reads...)
			sort.Strings(reads)
		}
		var writes []string
		if len(n.Writes) > 0 {
			writes = append([]string(nil), n.Writes...)
			sort.Strings(writes)
		}

		nodes[i] = semanticNode{
			ID:             n.ID,
			Type:           n.Type,
			IsEntry:        n.IsEntry,
			Model:          n.Model,
			SystemPrompt:   n.SystemPrompt,
			Tools:          tools,
			InputSchema:    n.InputSchema,
			OutputSchema:   n.OutputSchema,
			Reads:          reads,
			Writes:         writes,
			Budgets:        n.Budgets,
			Retry:          n.Retry,
			Permissions:    n.Permissions,
			Prompt:         n.Prompt,
			AllowEdit:      n.AllowEdit,
			TimeoutSeconds: n.TimeoutSeconds,
			OnTimeout:      n.OnTimeout,
			RouterMode:     n.RouterMode,
			JoinPolicy:     n.JoinPolicy,
		}
	}
	sort.Slice(nodes, func(i, j int) bool {
		return nodes[i].ID < nodes[j].ID
	})

	edges := make([]semanticEdge, len(g.Edges))
	for i, e := range g.Edges {
		edges[i] = semanticEdge{
			ID:            e.ID,
			From:          e.From,
			To:            e.To,
			Kind:          e.Kind,
			Expr:          e.Expr,
			Priority:      e.Priority,
			MaxTraversals: e.MaxTraversals,
			Map:           e.Map,
		}
	}
	sort.Slice(edges, func(i, j int) bool {
		return edges[i].ID < edges[j].ID
	})

	payload := struct {
		SchemaVersion string                      `json:"schema_version"`
		Name          string                      `json:"name"`
		State         map[string]StateDeclaration `json:"state,omitempty"`
		Defaults      any                         `json:"defaults,omitempty"`
		Budgets       *Budgets                    `json:"budgets,omitempty"`
		Nodes         []semanticNode              `json:"nodes"`
		Edges         []semanticEdge              `json:"edges"`
	}{
		SchemaVersion: g.SchemaVersion,
		Name:          g.Name,
		State:         g.State,
		Defaults:      g.Defaults,
		Budgets:       g.Budgets,
		Nodes:         nodes,
		Edges:         edges,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:]), nil
}
