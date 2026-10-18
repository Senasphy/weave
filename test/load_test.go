package test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"weave/internal/engine"
	"weave/internal/graph"
	"weave/internal/llm"
	"weave/internal/tools"
)

func TestLoad_100ConcurrentRuns(t *testing.T) {
	data, err := os.ReadFile("../examples/support_triage.json")
	if err != nil {
		t.Fatalf("failed to read support_triage.json: %v", err)
	}

	var g graph.WorkflowGraph
	if err := json.Unmarshal(data, &g); err != nil {
		t.Fatalf("failed to parse support_triage.json: %v", err)
	}

	memStore := engine.NewMemStore()
	llmProvider := llm.NewMultiProvider()
	toolRunner := tools.NewDefaultToolRunner("")
	clock := engine.RealClock{}
	idGen := engine.DefaultIDGen{}

	eng, err := engine.NewEngine(memStore, llmProvider, toolRunner, clock, idGen)
	if err != nil {
		t.Fatalf("failed to create engine: %v", err)
	}

	const concurrentRuns = 100
	var wg sync.WaitGroup
	wg.Add(concurrentRuns)

	start := time.Now()
	errChan := make(chan error, concurrentRuns)

	for i := 0; i < concurrentRuns; i++ {
		go func(idx int) {
			defer wg.Done()
			ctx := context.Background()

			runState, err := eng.CreateRun(ctx, &g, "v1", map[string]any{
				"ticket_id": fmt.Sprintf("TICK-%04d", idx),
				"amount":    50, // routes to standard reply without gate for automated completion
			})
			if err != nil {
				errChan <- fmt.Errorf("run %d CreateRun error: %w", idx, err)
				return
			}

			if err := eng.StartRun(ctx, runState.RunID); err != nil {
				errChan <- fmt.Errorf("run %d StartRun error: %w", idx, err)
				return
			}

			// Verify completion
			finalState, err := memStore.GetRunState(ctx, runState.RunID)
			if err != nil {
				errChan <- fmt.Errorf("run %d GetRunState error: %w", idx, err)
				return
			}
			if finalState.Status != engine.RunStatusSucceeded {
				errChan <- fmt.Errorf("run %d expected status succeeded, got %s", idx, finalState.Status)
				return
			}
		}(i)
	}

	wg.Wait()
	close(errChan)

	duration := time.Since(start)
	t.Logf("Completed %d concurrent runs in %v (avg %.2f ms/run)", concurrentRuns, duration, float64(duration.Milliseconds())/float64(concurrentRuns))

	var errs []error
	for err := range errChan {
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		t.Fatalf("%d out of %d runs failed during load test. First error: %v", len(errs), concurrentRuns, errs[0])
	}
}
