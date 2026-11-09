package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"weave/internal/engine"
	"weave/internal/graph"
	"weave/internal/store"
)

func (s *Server) handleCreateRun(w http.ResponseWriter, r *http.Request) {
	wsID, ok := s.resolveWorkspace(w, r)
	if !ok {
		return
	}

	wfID := chi.URLParam(r, "id")
	nStr := chi.URLParam(r, "n")
	n, err := strconv.Atoi(nStr)
	if err != nil {
		WriteProblem(w, http.StatusBadRequest, "bad_request", "Invalid version number", err.Error())
		return
	}

	// Verify workflow ownership before creating run (BOLA protection)
	if _, err := s.store.GetWorkflow(r.Context(), wsID, wfID); err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Workflow Not Found", err.Error())
		return
	}

	ver, err := s.store.GetWorkflowVersion(r.Context(), wfID, n)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Workflow Version Not Found", err.Error())
		return
	}

	var req struct {
		Input           any            `json:"input"`
		BudgetOverrides *graph.Budgets `json:"budget_overrides"`
		Mock            bool           `json:"mock"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	var g graph.WorkflowGraph
	if err := json.Unmarshal(ver.Graph, &g); err != nil {
		WriteProblem(w, http.StatusInternalServerError, "invalid_version_graph", "Corrupt version graph", err.Error())
		return
	}

	if req.BudgetOverrides != nil {
		g.Budgets = req.BudgetOverrides
	}

	runID := uuid.New().String()

	// Create database run record first to satisfy foreign key constraints
	_, err = s.store.CreateRunRecord(r.Context(), runID, wsID, ver.ID, req.Input, g.Budgets)
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "db_error", "Failed to persist run", err.Error())
		return
	}

	// Create run through engine
	runState, err := s.engine.CreateRunWithID(r.Context(), runID, &g, ver.ID, req.Input)
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "create_run_failed", "Failed to create run", err.Error())
		return
	}

	// SMELL-2 fix: Persist execution job to durable worker queue
	if s.store != nil {
		_ = s.store.EnqueueJob(r.Context(), runState.RunID, "", "run_start", nil)
	}

	// Kick off run execution asynchronously
	go func(runID string, graphCopy graph.WorkflowGraph) {
		s.engine.RegisterGraph(runID, &graphCopy)
		_ = s.engine.StartRun(context.Background(), runID)
	}(runState.RunID, g)

	runRec, err := s.store.GetRunRecord(r.Context(), runState.RunID)
	if err != nil {
		WriteJSON(w, http.StatusCreated, runState)
		return
	}

	WriteJSON(w, http.StatusCreated, runRec)
}

func (s *Server) handleListRuns(w http.ResponseWriter, r *http.Request) {
	wsID, ok := s.resolveWorkspace(w, r)
	if !ok {
		return
	}

	status := r.URL.Query().Get("status")
	runs, err := s.store.ListRuns(r.Context(), wsID, status)
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "internal_error", "Failed to list runs", err.Error())
		return
	}
	if runs == nil {
		runs = []store.RunRecord{}
	}
	WriteJSON(w, http.StatusOK, runs)
}

func (s *Server) handleGetRun(w http.ResponseWriter, r *http.Request) {
	wsID, ok := s.resolveWorkspace(w, r)
	if !ok {
		return
	}

	id := chi.URLParam(r, "id")
	rec, err := s.store.GetRunRecord(r.Context(), id)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Run Not Found", err.Error())
		return
	}

	if rec.WorkspaceID != "" && rec.WorkspaceID != wsID {
		WriteProblem(w, http.StatusForbidden, "forbidden", "Access Denied", "Run belongs to another workspace")
		return
	}

	WriteJSON(w, http.StatusOK, rec)
}

func (s *Server) handleGetRunEvents(w http.ResponseWriter, r *http.Request) {
	wsID, ok := s.resolveWorkspace(w, r)
	if !ok {
		return
	}

	id := chi.URLParam(r, "id")

	rec, err := s.store.GetRunRecord(r.Context(), id)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Run Not Found", err.Error())
		return
	}

	if rec.WorkspaceID != "" && rec.WorkspaceID != wsID {
		WriteProblem(w, http.StatusForbidden, "forbidden", "Access Denied", "Run belongs to another workspace")
		return
	}

	afterSeqStr := r.URL.Query().Get("after_seq")
	var afterSeq int64 = 0
	if afterSeqStr != "" {
		afterSeq, _ = strconv.ParseInt(afterSeqStr, 10, 64)
	}

	events, err := s.store.GetEvents(r.Context(), id, afterSeq)
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "internal_error", "Failed to fetch events", err.Error())
		return
	}
	if events == nil {
		events = []engine.Event{}
	}
	WriteJSON(w, http.StatusOK, events)
}

func (s *Server) handleStreamRunEvents(w http.ResponseWriter, r *http.Request) {
	wsID, ok := s.resolveWorkspace(w, r)
	if !ok {
		return
	}

	flusher, okFlush := w.(http.Flusher)
	if !okFlush {
		WriteProblem(w, http.StatusInternalServerError, "sse_unsupported", "Streaming not supported", "")
		return
	}

	runID := chi.URLParam(r, "id")

	// Verify run exists and belongs to caller's workspace (BOLA protection)
	runRec, err := s.store.GetRunRecord(r.Context(), runID)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Run Not Found", err.Error())
		return
	}

	if runRec.WorkspaceID != "" && runRec.WorkspaceID != wsID {
		WriteProblem(w, http.StatusForbidden, "forbidden", "Access Denied", "Run belongs to another workspace")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Determine starting sequence number from Last-Event-ID or query parameter
	var lastSeq int64 = 0
	if lastHeader := r.Header.Get("Last-Event-ID"); lastHeader != "" {
		lastSeq, _ = strconv.ParseInt(lastHeader, 10, 64)
	} else if q := r.URL.Query().Get("after_seq"); q != "" {
		lastSeq, _ = strconv.ParseInt(q, 10, 64)
	}

	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			events, err := s.store.GetEvents(r.Context(), runID, lastSeq)
			if err == nil && len(events) > 0 {
				for _, ev := range events {
					evJSON, _ := json.Marshal(ev)
					fmt.Fprintf(w, "id: %d\nevent: %s\ndata: %s\n\n", ev.Seq, ev.Type, evJSON)
					lastSeq = ev.Seq
				}
				flusher.Flush()
			}

			// Check if run is in terminal state
			currentRun, err := s.store.GetRunRecord(r.Context(), runID)
			if err == nil {
				st := engine.RunStatus(currentRun.Status)
				if st.IsTerminal() && (len(events) == 0) {
					return
				}
			}
		}
	}
}

func (s *Server) handleCancelRun(w http.ResponseWriter, r *http.Request) {
	wsID, ok := s.resolveWorkspace(w, r)
	if !ok {
		return
	}

	id := chi.URLParam(r, "id")

	runRec, err := s.store.GetRunRecord(r.Context(), id)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Run Not Found", err.Error())
		return
	}

	if runRec.WorkspaceID != "" && runRec.WorkspaceID != wsID {
		WriteProblem(w, http.StatusForbidden, "forbidden", "Access Denied", "Run belongs to another workspace")
		return
	}

	if err := s.engine.CancelRun(r.Context(), id); err != nil {
		WriteProblem(w, http.StatusInternalServerError, "cancel_failed", "Failed to cancel run", err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "run_cancelled"})
}

func (s *Server) handleReplayRun(w http.ResponseWriter, r *http.Request) {
	wsID, ok := s.resolveWorkspace(w, r)
	if !ok {
		return
	}

	originalRunID := chi.URLParam(r, "id")

	runRec, err := s.store.GetRunRecord(r.Context(), originalRunID)
	if err != nil {
		WriteProblem(w, http.StatusNotFound, "not_found", "Original run not found", err.Error())
		return
	}

	if runRec.WorkspaceID != "" && runRec.WorkspaceID != wsID {
		WriteProblem(w, http.StatusForbidden, "forbidden", "Access Denied", "Run belongs to another workspace")
		return
	}

	events, err := s.store.GetEvents(r.Context(), originalRunID, 0)
	if err != nil || len(events) == 0 {
		WriteProblem(w, http.StatusNotFound, "not_found", "Original run has no events", "")
		return
	}

	replayedState := engine.FoldEvents(originalRunID, events)
	WriteJSON(w, http.StatusOK, map[string]any{
		"replay_mode": "recorded",
		"state":       replayedState,
	})
}
