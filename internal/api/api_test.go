package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"weave/internal/engine"
	"weave/internal/graph"
	"weave/internal/llm"
	"weave/internal/store"
	"weave/internal/tools"
)

func getTestDatabaseURL() string {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		url = "postgres://postgres@localhost:5433/weave?sslmode=disable"
	}
	return url
}

func setupTestServer(t *testing.T) (*Server, *store.PostgresStore) {
	t.Helper()
	ctx := context.Background()
	dbURL := getTestDatabaseURL()
	st, err := store.NewPostgresStore(ctx, dbURL)
	if err != nil {
		t.Skipf("Skipping API integration test (no local database): %v", err)
		return nil, nil
	}

	fakeLLM := llm.NewMockProvider()
	fakeTools := tools.NewMockToolRunner()
	clock := engine.RealClock{}
	idGen := engine.DefaultIDGen{}

	eng, err := engine.NewEngine(st, fakeLLM, fakeTools, clock, idGen)
	if err != nil {
		t.Fatalf("failed to create engine: %v", err)
	}

	srv := NewServer(eng, st)
	return srv, st
}

func TestAPI_Healthz(t *testing.T) {
	srv, st := setupTestServer(t)
	if srv == nil {
		return
	}
	defer st.Close()

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestAPI_WorkflowLifecycle(t *testing.T) {
	srv, st := setupTestServer(t)
	if srv == nil {
		return
	}
	defer st.Close()

	// 1. Create Workflow
	createBody, _ := json.Marshal(map[string]any{
		"name":        "api-test-workflow",
		"description": "Integration test workflow",
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/workflows", bytes.NewReader(createBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var wf store.WorkflowRecord
	_ = json.Unmarshal(rec.Body.Bytes(), &wf)
	if wf.ID == "" {
		t.Fatalf("expected workflow ID, got empty")
	}

	// 2. Put Invalid Draft & Validate -> should report errors
	invalidDraft := map[string]any{
		"schema_version": "1",
		"name":           "api-test-workflow",
		"nodes":          []any{},
		"edges":          []any{},
	}
	draftBody, _ := json.Marshal(invalidDraft)
	req = httptest.NewRequest(http.MethodPut, "/v1/workflows/"+wf.ID+"/draft", bytes.NewReader(draftBody))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	// Validate invalid draft
	req = httptest.NewRequest(http.MethodPost, "/v1/workflows/"+wf.ID+"/validate", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	var valRes struct {
		Valid       bool               `json:"valid"`
		Diagnostics []graph.Diagnostic `json:"diagnostics"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &valRes)
	if valRes.Valid {
		t.Fatalf("expected invalid draft to fail validation")
	}

	// Attempt publish -> should return 422
	req = httptest.NewRequest(http.MethodPost, "/v1/workflows/"+wf.ID+"/publish", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 Unprocessable Entity, got %d", rec.Code)
	}

	// 3. Put Valid Draft & Publish
	validDraft := map[string]any{
		"schema_version": "1",
		"name":           "api-test-workflow",
		"budgets": map[string]any{
			"max_wall_seconds": 300,
			"max_tokens":       50000,
		},
		"nodes": []map[string]any{
			{
				"id":            "agent_1",
				"type":          "agent",
				"is_entry":      true,
				"model":         map[string]any{"provider": "mock", "name": "mock-llm"},
				"system_prompt": "You are a test agent.",
				"output_schema": map[string]any{"type": "object"},
			},
		},
		"edges": []any{},
	}
	validDraftBytes, _ := json.Marshal(validDraft)
	req = httptest.NewRequest(http.MethodPut, "/v1/workflows/"+wf.ID+"/draft", bytes.NewReader(validDraftBytes))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on valid draft save, got %d", rec.Code)
	}

	// Publish
	req = httptest.NewRequest(http.MethodPost, "/v1/workflows/"+wf.ID+"/publish", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on publish, got %d: %s", rec.Code, rec.Body.String())
	}

	var ver store.VersionRecord
	_ = json.Unmarshal(rec.Body.Bytes(), &ver)
	if ver.VersionNumber != 1 {
		t.Fatalf("expected version 1, got %d", ver.VersionNumber)
	}

	// 4. Trigger Run
	runReqBody, _ := json.Marshal(map[string]any{
		"input": map[string]any{"hello": "world"},
	})
	req = httptest.NewRequest(http.MethodPost, "/v1/workflows/"+wf.ID+"/versions/1/runs", bytes.NewReader(runReqBody))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 on run trigger, got %d: %s", rec.Code, rec.Body.String())
	}

	var runRec store.RunRecord
	_ = json.Unmarshal(rec.Body.Bytes(), &runRec)
	if runRec.ID == "" {
		t.Fatalf("expected run ID, got empty")
	}

	// Allow background goroutine to execute
	time.Sleep(100 * time.Millisecond)

	// Fetch Run Events
	req = httptest.NewRequest(http.MethodGet, "/v1/runs/"+runRec.ID+"/events", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on get events, got %d", rec.Code)
	}

	var events []engine.Event
	_ = json.Unmarshal(rec.Body.Bytes(), &events)
	if len(events) == 0 {
		t.Fatalf("expected run events to be logged, got 0")
	}
}

func TestAPI_AuthMe(t *testing.T) {
	srv, _ := setupTestServer(t)
	if srv == nil {
		return
	}

	// 1. Unauthenticated request to /v1/me
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode json: %v", err)
	}
	if res["authenticated"] != false {
		t.Fatalf("expected unauthenticated, got %v", res["authenticated"])
	}
	if res["workspace_id"] != defaultWorkspaceID {
		t.Fatalf("expected default workspace id, got %v", res["workspace_id"])
	}
}
