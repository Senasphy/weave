package api

import (
	"encoding/json"
	"net/http"
)

// ProblemDetails represents an RFC 9457 HTTP Problem Details error.
type ProblemDetails struct {
	Type     string `json:"type,omitempty"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail,omitempty"`
	Code     string `json:"code,omitempty"`
	Instance string `json:"instance,omitempty"`
}

// WriteProblem responds with an RFC 9457 problem JSON error.
func WriteProblem(w http.ResponseWriter, status int, code, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ProblemDetails{
		Title:  title,
		Status: status,
		Detail: detail,
		Code:   code,
	})
}

// WriteJSON responds with standard JSON payload.
func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
