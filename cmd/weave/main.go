package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"weave/internal/api"
	"weave/internal/engine"
	"weave/internal/graph"
	"weave/internal/llm"
	"weave/internal/store"
	"weave/internal/tools"
	"weave/internal/trace"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]
	switch command {
	case "validate":
		runValidate(os.Args[2:])
	case "run":
		runLocalWorkflow(os.Args[2:])
	case "serve", "api":
		runServer(os.Args[2:])
	case "worker":
		runWorker(os.Args[2:])
	case "all":
		runAll(os.Args[2:])
	case "version", "--version", "-v":
		fmt.Println("weave v1.0.0")
	case "help", "--help", "-h":
		printUsage()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Weave - Visual Multi-Agent Orchestration Engine")
	fmt.Println("\nUsage:")
	fmt.Println("  weave validate <file.json> [--json]       Validate a workflow graph")
	fmt.Println("  weave run <file.json> [--input <data>]    Run a workflow locally")
	fmt.Println("  weave serve [--port 8080]                 Start the API server")
	fmt.Println("  weave worker                              Run the background job queue worker")
	fmt.Println("  weave all [--port 8080]                   Run both API server and background worker")
}

func runValidate(args []string) {
	fs := flag.NewFlagSet("validate", flag.ExitOnError)
	outputJSON := fs.Bool("json", false, "Output diagnostics in JSON format")
	_ = fs.Parse(args)

	if fs.NArg() < 1 {
		fmt.Fprintf(os.Stderr, "Usage: weave validate <file.json> [--json]\n")
		os.Exit(1)
	}

	filePath := fs.Arg(0)
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file '%s': %v\n", filePath, err)
		os.Exit(1)
	}

	var g graph.WorkflowGraph
	if err := json.Unmarshal(data, &g); err != nil {
		if *outputJSON {
			diags := []graph.Diagnostic{{
				Severity: graph.SeverityError,
				Code:     "invalid_json",
				Message:  fmt.Sprintf("Failed to parse JSON: %v", err),
			}}
			enc, _ := json.MarshalIndent(diags, "", "  ")
			fmt.Println(string(enc))
		} else {
			fmt.Fprintf(os.Stderr, "Error: Invalid JSON syntax in '%s': %v\n", filePath, err)
		}
		os.Exit(1)
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

	if *outputJSON {
		enc, _ := json.MarshalIndent(diags, "", "  ")
		fmt.Println(string(enc))
	} else {
		if len(diags) == 0 {
			hash, _ := graph.SemanticHash(&g)
			fmt.Printf("✓ Workflow '%s' is valid. (Semantic Hash: %s)\n", g.Name, hash[:12])
		} else {
			fmt.Printf("Validation results for '%s':\n", filePath)
			for _, d := range diags {
				prefix := "⚠️  WARN"
				if d.Severity == graph.SeverityError {
					prefix = "❌ ERROR"
				}
				details := ""
				if d.NodeID != "" {
					details += fmt.Sprintf(" [node: %s]", d.NodeID)
				}
				if d.EdgeID != "" {
					details += fmt.Sprintf(" [edge: %s]", d.EdgeID)
				}
				fmt.Printf("%s: %s%s - %s\n", prefix, d.Code, details, d.Message)
			}
		}
	}

	if hasErrors {
		os.Exit(1)
	}
}

func runLocalWorkflow(args []string) {
	fs := flag.NewFlagSet("run", flag.ExitOnError)
	inputStr := fs.String("input", "{}", "JSON input payload for the workflow")
	_ = fs.Parse(args)

	if fs.NArg() < 1 {
		fmt.Fprintf(os.Stderr, "Usage: weave run <file.json> [--input <json>]\n")
		os.Exit(1)
	}

	filePath := fs.Arg(0)
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file: %v\n", err)
		os.Exit(1)
	}

	var g graph.WorkflowGraph
	if err := json.Unmarshal(data, &g); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing workflow JSON: %v\n", err)
		os.Exit(1)
	}

	var input any
	_ = json.Unmarshal([]byte(*inputStr), &input)

	store := engine.NewMemStore()
	llmProvider := llm.NewMultiProvider()
	toolRunner := tools.NewDefaultToolRunner("")
	clock := engine.RealClock{}
	idGen := engine.DefaultIDGen{}

	eng, err := engine.NewEngine(store, llmProvider, toolRunner, clock, idGen)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error initializing engine: %v\n", err)
		os.Exit(1)
	}

	ctx := context.Background()
	runState, err := eng.CreateRun(ctx, &g, "local", input)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error creating run: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Starting workflow '%s' (Run ID: %s)...\n", g.Name, runState.RunID)
	if err := eng.StartRun(ctx, runState.RunID); err != nil {
		fmt.Fprintf(os.Stderr, "Run execution error: %v\n", err)
	}

	// Output narration
	events, _ := store.GetEvents(ctx, runState.RunID, 0)
	fmt.Println("\nExecution Narration:")
	fmt.Print(trace.GenerateHumanNarration(events))

	finalState, _ := store.GetRunState(ctx, runState.RunID)
	fmt.Printf("\nFinal Run Status: %s\n", finalState.Status)
	outJSON, _ := json.MarshalIndent(finalState.Output, "", "  ")
	fmt.Printf("Final Output:\n%s\n", string(outJSON))
}

func getDBURL() string {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		if os.Getenv("RENDER") != "" || os.Getenv("WEAVE_ENV") == "production" || os.Getenv("FLY_APP_NAME") != "" {
			fmt.Fprintln(os.Stderr, "========================================================================")
			fmt.Fprintln(os.Stderr, "FATAL ERROR: DATABASE_URL environment variable is missing!")
			fmt.Fprintln(os.Stderr, "")
			fmt.Fprintln(os.Stderr, "Please configure DATABASE_URL in your Render dashboard:")
			fmt.Fprintln(os.Stderr, "Dashboard -> weave-backend -> Environment -> Add Environment Variable")
			fmt.Fprintln(os.Stderr, "")
			fmt.Fprintln(os.Stderr, "Paste your Neon database connection string:")
			fmt.Fprintln(os.Stderr, "postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require")
			fmt.Fprintln(os.Stderr, "========================================================================")
			os.Exit(1)
		}
		url = "postgres://postgres@localhost:5433/weave?sslmode=disable"
	}
	return url
}

func runServer(args []string) {
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	defaultPort := 8080
	if envPort := os.Getenv("PORT"); envPort != "" {
		if p, err := strconv.Atoi(envPort); err == nil {
			defaultPort = p
		}
	}
	port := fs.Int("port", defaultPort, "Port for the HTTP server")
	_ = fs.Parse(args)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	st, err := store.NewPostgresStore(ctx, getDBURL())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Postgres connection error: %v\n", err)
		os.Exit(1)
	}
	defer st.Close()

	llmProvider := llm.NewMultiProvider()
	toolRunner := tools.NewDefaultToolRunner("")
	clock := engine.RealClock{}
	idGen := engine.DefaultIDGen{}

	eng, err := engine.NewEngine(st, llmProvider, toolRunner, clock, idGen)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Engine init error: %v\n", err)
		os.Exit(1)
	}

	srv := api.NewServer(eng, st)
	srv.StartTimeoutScheduler(ctx, 30*time.Second)

	addr := fmt.Sprintf(":%d", *port)
	httpServer := &http.Server{
		Addr:    addr,
		Handler: srv.Router(),
	}

	go func() {
		fmt.Printf("Weave API server listening on http://localhost%s\n", addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\nShutting down server...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
	fmt.Println("Server stopped cleanly.")
}

func runWorker(args []string) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	st, err := store.NewPostgresStore(ctx, getDBURL())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Worker DB connection error: %v\n", err)
		os.Exit(1)
	}
	defer st.Close()

	workerID := fmt.Sprintf("worker-%d", time.Now().UnixNano())
	fmt.Printf("Starting Weave background worker (%s)...\n", workerID)

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-sigChan:
			fmt.Println("Worker shutting down...")
			return
		case <-ticker.C:
			// Claim job with SELECT ... FOR UPDATE SKIP LOCKED
			job, err := st.ClaimJob(ctx, workerID, 30*time.Second)
			if err != nil {
				continue
			}
			if job != nil {
				fmt.Printf("[%s] Claimed job %s (step: %s)\n", workerID, job.ID, job.StepID)
				_ = st.CompleteJob(ctx, job.ID)
			}
		}
	}
}

func runAll(args []string) {
	go runWorker(args)
	runServer(args)
}
