package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"weave/internal/engine"
)

func (s *Server) handleListGates(w http.ResponseWriter, r *http.Request) {
	gates, err := s.store.GetPendingGates(r.Context())
	if err != nil {
		WriteProblem(w, http.StatusInternalServerError, "internal_error", "Failed to list gates", err.Error())
		return
	}
	if gates == nil {
		gates = []engine.GateRecord{}
	}
	WriteJSON(w, http.StatusOK, gates)
}

func (s *Server) handleResolveGate(w http.ResponseWriter, r *http.Request) {
	gateID := chi.URLParam(r, "id")

	var req struct {
		Resolution string `json:"resolution"`
		Actor      string `json:"actor"`
		Payload    any    `json:"payload"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteProblem(w, http.StatusBadRequest, "bad_request", "Invalid request body", err.Error())
		return
	}

	if req.Resolution != "approve" && req.Resolution != "reject" && req.Resolution != "edit" {
		WriteProblem(w, http.StatusBadRequest, "invalid_resolution", "Resolution must be 'approve', 'reject', or 'edit'", "")
		return
	}

	if req.Actor == "" {
		req.Actor = "user"
	}

	err := s.engine.ResolveGate(r.Context(), gateID, req.Resolution, req.Actor, req.Payload)
	if err != nil {
		if strings.Contains(err.Error(), "conflict") || strings.Contains(err.Error(), "already") {
			WriteProblem(w, http.StatusConflict, "gate_conflict", "Gate Already Resolved", err.Error())
			return
		}
		if strings.Contains(err.Error(), "not found") {
			WriteProblem(w, http.StatusNotFound, "not_found", "Gate Not Found", err.Error())
			return
		}
		WriteProblem(w, http.StatusInternalServerError, "resolve_failed", "Failed to resolve gate", err.Error())
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"status":     "resolved",
		"gate_id":    gateID,
		"resolution": req.Resolution,
	})
}
