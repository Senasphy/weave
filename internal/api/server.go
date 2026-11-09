package api

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"runtime"
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
	router       *chi.Mux
	engine       *engine.Engine
	store        *store.PostgresStore
	authRequired bool
}

// NewServer initializes routes, middleware, and dependencies.
func NewServer(eng *engine.Engine, st *store.PostgresStore) *Server {
	authReq := true
	if env := os.Getenv("WEAVE_AUTH_REQUIRED"); env == "false" || env == "0" {
		authReq = false
	}

	s := &Server{
		router:       chi.NewRouter(),
		engine:       eng,
		store:        st,
		authRequired: authReq,
	}

	s.setupMiddleware()
	s.setupRoutes()

	return s
}

// SetAuthRequired explicitly enables or disables auth enforcement (useful for tests).
func (s *Server) SetAuthRequired(required bool) {
	s.authRequired = required
}

func (s *Server) setupMiddleware() {
	s.router.Use(middleware.RequestID)
	s.router.Use(middleware.RealIP)
	s.router.Use(middleware.Logger)
	s.router.Use(middleware.Recoverer)

	// Body size limiter: 10MB max request body to prevent DoS memory exhaustion
	s.router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)
			next.ServeHTTP(w, r)
		})
	})

	// Configure strict CORS with explicit allowed origins
	allowedOrigins := []string{
		"http://localhost:3000",
		"http://localhost:8080",
		"http://127.0.0.1:3000",
	}
	if custom := os.Getenv("ALLOWED_ORIGINS"); custom != "" {
		for _, o := range strings.Split(custom, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}
	if appURL := os.Getenv("NEXT_PUBLIC_APP_URL"); appURL != "" {
		allowedOrigins = append(allowedOrigins, strings.TrimRight(strings.TrimSpace(appURL), "/"))
	}

	s.router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
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

// requireAuth rejects unauthenticated requests with 401 Unauthorized when auth is active.
func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.authRequired {
			next.ServeHTTP(w, r)
			return
		}

		sess, ok := r.Context().Value(authSessionContextKey).(*store.AuthSession)
		if !ok || sess == nil {
			WriteProblem(w, http.StatusUnauthorized, "unauthorized", "Unauthorized", "Authentication required to access this resource")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// resolveWorkspace extracts and validates the workspace for the current caller.
func (s *Server) resolveWorkspace(w http.ResponseWriter, r *http.Request) (string, bool) {
	if sess, ok := r.Context().Value(authSessionContextKey).(*store.AuthSession); ok && sess != nil {
		wsHeader := r.Header.Get("X-Workspace-ID")
		if wsHeader != "" && wsHeader != sess.WorkspaceID {
			WriteProblem(w, http.StatusForbidden, "forbidden", "Access Denied", fmt.Sprintf("User does not have access to workspace '%s'", wsHeader))
			return "", false
		}
		if sess.WorkspaceID != "" {
			return sess.WorkspaceID, true
		}
	}

	if !s.authRequired {
		ws := r.Header.Get("X-Workspace-ID")
		if ws != "" {
			return ws, true
		}
		return defaultWorkspaceID, true
	}

	WriteProblem(w, http.StatusUnauthorized, "unauthorized", "Unauthorized", "Authentication required to access this workspace")
	return "", false
}

func (s *Server) setupRoutes() {
	// Liveness and health
	s.router.Get("/healthz", s.handleHealthz)
	s.router.Get("/readyz", s.handleReadyz)
	s.router.Get("/metrics", s.handleMetrics)

	// v1 API routes
	s.router.Route("/v1", func(r chi.Router) {
		// Public metadata
		r.Get("/models", s.handleListModels)

		// Protected endpoints
		r.Group(func(authGroup chi.Router) {
			authGroup.Use(s.requireAuth)

			// Identity and session inspection
			authGroup.Get("/me", s.handleMe)

			// Workflows
			authGroup.Get("/workflows", s.handleListWorkflows)
			authGroup.Post("/workflows", s.handleCreateWorkflow)
			authGroup.Get("/workflows/{id}", s.handleGetWorkflow)
			authGroup.Get("/workflows/{id}/draft", s.handleGetWorkflowDraft)
			authGroup.Put("/workflows/{id}/draft", s.handleUpdateWorkflowDraft)
			authGroup.Post("/workflows/{id}/validate", s.handleValidateWorkflow)
			authGroup.Post("/workflows/{id}/publish", s.handlePublishWorkflow)
			authGroup.Get("/workflows/{id}/versions", s.handleListWorkflowVersions)
			authGroup.Get("/workflows/{id}/versions/{n}", s.handleGetWorkflowVersion)
			authGroup.Post("/workflows/{id}/versions/{n}/runs", s.handleCreateRun)

			// Runs
			authGroup.Get("/runs", s.handleListRuns)
			authGroup.Get("/runs/{id}", s.handleGetRun)
			authGroup.Get("/runs/{id}/events", s.handleGetRunEvents)
			authGroup.Get("/runs/{id}/stream", s.handleStreamRunEvents)
			authGroup.Post("/runs/{id}/cancel", s.handleCancelRun)
			authGroup.Post("/runs/{id}/replay", s.handleReplayRun)

			// Gates
			authGroup.Get("/gates", s.handleListGates)
			authGroup.Post("/gates/{id}/resolve", s.handleResolveGate)
		})
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
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.WriteHeader(http.StatusOK)

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	numGoroutines := runtime.NumGoroutine()

	var totalRuns, activeRuns, succeededRuns, failedRuns, waitingGates, queuedJobs int64
	if s.store != nil {
		if metrics, err := s.store.GetSystemMetrics(r.Context()); err == nil && metrics != nil {
			totalRuns = metrics.TotalRuns
			activeRuns = metrics.ActiveRuns
			succeededRuns = metrics.SucceededRuns
			failedRuns = metrics.FailedRuns
			waitingGates = metrics.WaitingGates
			queuedJobs = metrics.QueuedJobs
		}
	}

	fmt.Fprintf(w, "# HELP weave_runs_total Total number of runs in the system\n# TYPE weave_runs_total gauge\nweave_runs_total %d\n\n", totalRuns)
	fmt.Fprintf(w, "# HELP weave_runs_active Runs currently active or waiting\n# TYPE weave_runs_active gauge\nweave_runs_active %d\n\n", activeRuns)
	fmt.Fprintf(w, "# HELP weave_runs_by_status Total runs partitioned by terminal status\n# TYPE weave_runs_by_status gauge\nweave_runs_by_status{status=\"succeeded\"} %d\nweave_runs_by_status{status=\"failed\"} %d\n\n", succeededRuns, failedRuns)
	fmt.Fprintf(w, "# HELP weave_gates_waiting Pending human review gates\n# TYPE weave_gates_waiting gauge\nweave_gates_waiting %d\n\n", waitingGates)
	fmt.Fprintf(w, "# HELP weave_jobs_queued Background worker jobs queued\n# TYPE weave_jobs_queued gauge\nweave_jobs_queued %d\n\n", queuedJobs)
	fmt.Fprintf(w, "# HELP weave_goroutines Active goroutines in runtime\n# TYPE weave_goroutines gauge\nweave_goroutines %d\n\n", numGoroutines)
	fmt.Fprintf(w, "# HELP weave_memory_alloc_bytes Heap bytes allocated and currently in use\n# TYPE weave_memory_alloc_bytes gauge\nweave_memory_alloc_bytes %d\n", mem.Alloc)
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
