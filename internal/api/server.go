package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"weave/internal/engine"
	"weave/internal/store"
)

type contextKey string

const authSessionContextKey contextKey = "weave_auth_session"

// Server coordinates HTTP handlers and engine operations.
type Server struct {
	router *chi.Mux
	engine *engine.Engine
	store  *store.PostgresStore
}

// NewServer initializes routes, middleware, and dependencies.
func NewServer(eng *engine.Engine, st *store.PostgresStore) *Server {
	s := &Server{
		router: chi.NewRouter(),
		engine: eng,
		store:  st,
	}

	s.setupMiddleware()
	s.setupRoutes()

	return s
}

func (s *Server) setupMiddleware() {
	s.router.Use(middleware.RequestID)
	s.router.Use(middleware.RealIP)
	s.router.Use(middleware.Logger)
	s.router.Use(middleware.Recoverer)
	s.router.Use(middleware.Timeout(60 * time.Second))

	s.router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "Last-Event-ID", "X-Workspace-ID"},
		ExposedHeaders:   []string{"Link", "Last-Event-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	s.router.Use(s.authMiddleware)
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := ""

		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}

		if token == "" {
			if cookie, err := r.Cookie("better-auth.session_token"); err == nil && cookie.Value != "" {
				token = cookie.Value
			} else if cookie, err := r.Cookie("__Secure-better-auth.session_token"); err == nil && cookie.Value != "" {
				token = cookie.Value
			} else if cookie, err := r.Cookie("session_token"); err == nil && cookie.Value != "" {
				token = cookie.Value
			}
		}

		if token != "" && s.store != nil {
			sess, err := s.store.VerifySession(r.Context(), token)
			if err == nil && sess != nil {
				ctx := context.WithValue(r.Context(), authSessionContextKey, sess)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) setupRoutes() {
	// Liveness and health
	s.router.Get("/healthz", s.handleHealthz)
	s.router.Get("/readyz", s.handleReadyz)
	s.router.Get("/metrics", s.handleMetrics)

	// v1 API routes
	s.router.Route("/v1", func(r chi.Router) {
		// Identity and session inspection
		r.Get("/me", s.handleMe)

		// Workflows
		r.Get("/workflows", s.handleListWorkflows)
		r.Post("/workflows", s.handleCreateWorkflow)
		r.Get("/workflows/{id}", s.handleGetWorkflow)
		r.Get("/workflows/{id}/draft", s.handleGetWorkflowDraft)
		r.Put("/workflows/{id}/draft", s.handleUpdateWorkflowDraft)
		r.Post("/workflows/{id}/validate", s.handleValidateWorkflow)
		r.Post("/workflows/{id}/publish", s.handlePublishWorkflow)
		r.Get("/workflows/{id}/versions", s.handleListWorkflowVersions)
		r.Get("/workflows/{id}/versions/{n}", s.handleGetWorkflowVersion)
		r.Post("/workflows/{id}/versions/{n}/runs", s.handleCreateRun)

		// Runs
		r.Get("/runs", s.handleListRuns)
		r.Get("/runs/{id}", s.handleGetRun)
		r.Get("/runs/{id}/events", s.handleGetRunEvents)
		r.Get("/runs/{id}/stream", s.handleStreamRunEvents)
		r.Post("/runs/{id}/cancel", s.handleCancelRun)
		r.Post("/runs/{id}/replay", s.handleReplayRun)

		// Gates
		r.Get("/gates", s.handleListGates)
		r.Post("/gates/{id}/resolve", s.handleResolveGate)

		// Models & Tools
		r.Get("/models", s.handleListModels)
	})
}

func (s *Server) Router() http.Handler {
	return s.router
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	sess, ok := r.Context().Value(authSessionContextKey).(*store.AuthSession)
	if !ok || sess == nil {
		WriteJSON(w, http.StatusOK, map[string]interface{}{
			"authenticated": false,
			"workspace_id":  defaultWorkspaceID,
		})
		return
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"authenticated":          true,
		"user_id":                sess.UserID,
		"user_name":              sess.UserName,
		"user_email":             sess.UserEmail,
		"active_organization_id": sess.ActiveOrganizationID,
		"workspace_id":           sess.WorkspaceID,
		"workspace_name":         sess.WorkspaceName,
		"expires_at":             sess.ExpiresAt,
	})
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("# HELP weave_runs_total Total number of runs\n# TYPE weave_runs_total counter\nweave_runs_total 0\n"))
}

// Background scheduler tick for checking gate timeouts
func (s *Server) StartTimeoutScheduler(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				_ = s.engine.CheckTimeouts(ctx)
			}
		}
	}()
}
