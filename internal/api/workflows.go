package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"weave/internal/graph"
	"weave/internal/llm"
	"weave/internal/store"
)

const defaultWorkspaceID = "00000000-0000-0000-0000-000000000001"

func (s *Server) getWorkspaceID(r *http.Request) string {
	ws := r.Header.Get("X-Workspace-ID")
	if ws != "" {
		return ws
	}
	return defaultWorkspaceID
}

func (s *Server) handleListWorkflows(w http.ResponseWriter, r *http.Request) {
	wsID := s.getWorkspaceID(r)
	list, err := s.store.ListWorkflows(r.Context(), wsID)
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "internal_error", "Database Error", err.Error())
		return
	}
	if list == nil {
		list = []store.WorkflowRecord{}
	}
	WriteJSON(w, http.StatusOK, list)
}

func (s *Server) handleCreateWorkflow(w http.ResponseWriter, r *http.Request) {
	wsID := s.getWorkspaceID(r)
	var req struct {
		Name         string                `json:"name"`
		Description  string                `json:"description"`
		InitialGraph *graph.WorkflowGraph `json:"initial_graph"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteProblem(w, http.StatusBadRequest, "bad_request", "Invalid Request Body", err.Error())
		return
	}

	if req.Name == "" {
		WriteProblem(w, http.StatusBadRequest, "validation_error", "Validation Error", "Workflow name is required")
		return
	}

	wf, err := s.store.CreateWorkflow(r.Context(), wsID, req.Name, req.Description, req.InitialGraph)
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "internal_error", "Failed to create workflow", err.Error())
		return
	}

	WriteJSON(w, http.StatusCreated, wf)
}

func (s *Server) handleGetWorkflow(w http.ResponseWriter, r *http.Request) {
	wsID := s.getWorkspaceID(r)
	id := chi.URLParam(r, "id")

	wf, err := s.store.GetWorkflow(r.Context(), wsID, id)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Workflow Not Found", err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, wf)
}

func (s *Server) handleGetWorkflowDraft(w http.ResponseWriter, r *http.Request) {
	wsID := s.getWorkspaceID(r)
	id := chi.URLParam(r, "id")

	wf, err := s.store.GetWorkflow(r.Context(), wsID, id)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Workflow Not Found", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if len(wf.DraftGraph) > 0 && string(wf.DraftGraph) != "{}" && string(wf.DraftGraph) != "null" {
		_, _ = w.Write(wf.DraftGraph)
	} else {
		defJSON := fmt.Sprintf(`{"schema_version":"1","name":%q,"nodes":[],"edges":[]}`, wf.Name)
		_, _ = w.Write([]byte(defJSON))
	}
}

func (s *Server) handleUpdateWorkflowDraft(w http.ResponseWriter, r *http.Request) {
	wsID := s.getWorkspaceID(r)
	id := chi.URLParam(r, "id")

	var rawDraft json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&rawDraft); err != nil {
		WriteProblem(w, http.StatusBadRequest, "bad_request", "Invalid JSON Draft", err.Error())
		return
	}

	if err := s.store.UpdateWorkflowDraft(r.Context(), wsID, id, rawDraft); err != nil {
		WriteProblem(w, http.StatusInternalServerError, "internal_error", "Failed to save draft", err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"status": "draft_updated"})
}

func (s *Server) handleValidateWorkflow(w http.ResponseWriter, r *http.Request) {
	wsID := s.getWorkspaceID(r)
	id := chi.URLParam(r, "id")

	var g graph.WorkflowGraph
	// Attempt decoding from body first
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
			WriteProblem(w, http.StatusBadRequest, "bad_request", "Invalid JSON Graph", err.Error())
			return
		}
	} else {
		// Fetch draft from database
		wf, err := s.store.GetWorkflow(r.Context(), wsID, id)
		if err != nil {
			WriteProblem(w, http.StatusNotFound, "not_found", "Workflow Not Found", err.Error())
			return
		}
		if err := json.Unmarshal(wf.DraftGraph, &g); err != nil {
			WriteProblem(w, http.StatusBadRequest, "invalid_draft", "Failed to parse draft graph", err.Error())
			return
		}
	}

	cfg := &graph.WorkspaceConfig{
		AllowedTools: map[string]graph.ToolDeclaration{
			"echo":          {ID: "echo", Kind: "builtin", SideEffects: false},
			"calculator":    {ID: "calculator", Kind: "builtin", SideEffects: false},
			"http_request":  {ID: "http_request", Kind: "http", SideEffects: true},
			"kb_search":     {ID: "kb_search", Kind: "builtin", SideEffects: false},
			"stripe_refund": {ID: "stripe_refund", Kind: "http", SideEffects: true},
		},
		KnownModelPrices:         llm.KnownModelKeys(),
		RequireGateForSideEffects: true,
		DefaultBudgets: graph.Budgets{
			MaxWallSeconds: 300,
			MaxCostUSD:     1.0,
		},
	}

	diags := graph.Validate(&g, cfg)
	hasErrors := false
	for _, d := range diags {
		if d.Severity == graph.SeverityError {
			hasErrors = true
			break
		}
	}

	hash, _ := graph.SemanticHash(&g)
	WriteJSON(w, http.StatusOK, map[string]any{
		"valid":         !hasErrors,
		"semantic_hash": hash,
		"diagnostics":   diags,
	})
}

func (s *Server) handlePublishWorkflow(w http.ResponseWriter, r *http.Request) {
	wsID := s.getWorkspaceID(r)
	id := chi.URLParam(r, "id")

	wf, err := s.store.GetWorkflow(r.Context(), wsID, id)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Workflow Not Found", err.Error())
		return
	}

	var g graph.WorkflowGraph
	if err := json.Unmarshal(wf.DraftGraph, &g); err != nil {
		WriteProblem(w, http.StatusBadRequest, "invalid_draft", "Draft graph is invalid JSON", err.Error())
		return
	}

	cfg := &graph.WorkspaceConfig{
		AllowedTools: map[string]graph.ToolDeclaration{
			"echo":          {ID: "echo", Kind: "builtin", SideEffects: false},
			"calculator":    {ID: "calculator", Kind: "builtin", SideEffects: false},
			"http_request":  {ID: "http_request", Kind: "http", SideEffects: true},
			"kb_search":     {ID: "kb_search", Kind: "builtin", SideEffects: false},
			"stripe_refund": {ID: "stripe_refund", Kind: "http", SideEffects: true},
		},
		KnownModelPrices:         llm.KnownModelKeys(),
		RequireGateForSideEffects: true,
		DefaultBudgets: graph.Budgets{
			MaxWallSeconds: 300,
			MaxCostUSD:     1.0,
		},
	}

	diags := graph.Validate(&g, cfg)
	for _, d := range diags {
		if d.Severity == graph.SeverityError {
			WriteJSON(w, http.StatusUnprocessableEntity, map[string]any{
				"code":        "validation_failed",
				"message":     "Validation errors block publishing",
				"diagnostics": diags,
			})
			return
		}
	}

	hash, _ := graph.SemanticHash(&g)
	version, err := s.store.PublishWorkflowVersion(r.Context(), wsID, id, wf.DraftGraph, hash, "developer")
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "publish_failed", "Failed to publish version", err.Error())
		return
	}

	WriteJSON(w, http.StatusCreated, version)
}

func (s *Server) handleListWorkflowVersions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	versions, err := s.store.ListWorkflowVersions(r.Context(), id)
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "internal_error", "Failed to list versions", err.Error())
		return
	}
	if versions == nil {
		versions = []store.VersionRecord{}
	}
	WriteJSON(w, http.StatusOK, versions)
}

func (s *Server) handleGetWorkflowVersion(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	nStr := chi.URLParam(r, "n")
	n, err := strconv.Atoi(nStr)
	if err != nil {
		WriteProblem(w, http.StatusBadRequest, "bad_request", "Invalid version number", err.Error())
		return
	}

	ver, err := s.store.GetWorkflowVersion(r.Context(), id, n)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Version Not Found", err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, ver)
}
