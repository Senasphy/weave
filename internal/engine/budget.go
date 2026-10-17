package engine

import (
	"fmt"
	"time"

	"weave/internal/graph"
)

// BudgetViolation describes which resource limit was exceeded.
type BudgetViolation struct {
	Dimension string  `json:"dimension"`
	Limit     float64 `json:"limit"`
	Current   float64 `json:"current"`
	Message   string  `json:"message"`
}

func (b BudgetViolation) Error() string {
	return b.Message
}

// CheckRunBudgetPreCall verifies that an impending call won't immediately exceed run limits.
func CheckRunBudgetPreCall(usage RunUsage, budgets *graph.Budgets, estTokens int, estCost float64, startedAt, now time.Time) error {
	if budgets == nil {
		return nil
	}

	// 1. Max wall seconds
	if budgets.MaxWallSeconds > 0 && !startedAt.IsZero() {
		elapsed := now.Sub(startedAt).Seconds()
		if elapsed >= float64(budgets.MaxWallSeconds) {
			return BudgetViolation{
				Dimension: "max_wall_seconds",
				Limit:     float64(budgets.MaxWallSeconds),
				Current:   elapsed,
				Message:   fmt.Sprintf("run wall time (%.1fs) reached limit (%ds)", elapsed, budgets.MaxWallSeconds),
			}
		}
	}

	// 2. Max steps
	if budgets.MaxSteps > 0 && usage.TotalSteps >= budgets.MaxSteps {
		return BudgetViolation{
			Dimension: "max_steps",
			Limit:     float64(budgets.MaxSteps),
			Current:   float64(usage.TotalSteps),
			Message:   fmt.Sprintf("run steps (%d) reached limit (%d)", usage.TotalSteps, budgets.MaxSteps),
		}
	}

	// 3. Conservative tokens check
	if budgets.MaxTokens > 0 && usage.TotalTokens+estTokens > budgets.MaxTokens {
		return BudgetViolation{
			Dimension: "max_tokens",
			Limit:     float64(budgets.MaxTokens),
			Current:   float64(usage.TotalTokens + estTokens),
			Message:   fmt.Sprintf("projected run tokens (%d) exceeds limit (%d)", usage.TotalTokens+estTokens, budgets.MaxTokens),
		}
	}

	// 4. Conservative cost check
	if budgets.MaxCostUSD > 0 && usage.TotalCostUSD+estCost > budgets.MaxCostUSD {
		return BudgetViolation{
			Dimension: "max_cost_usd",
			Limit:     budgets.MaxCostUSD,
			Current:   usage.TotalCostUSD + estCost,
			Message:   fmt.Sprintf("projected run cost ($%.4f) exceeds limit ($%.4f)", usage.TotalCostUSD+estCost, budgets.MaxCostUSD),
		}
	}

	return nil
}

// CheckRunBudgetPostCall verifies actual usage against limits.
func CheckRunBudgetPostCall(usage RunUsage, budgets *graph.Budgets, startedAt, now time.Time) error {
	if budgets == nil {
		return nil
	}

	if budgets.MaxWallSeconds > 0 && !startedAt.IsZero() {
		elapsed := now.Sub(startedAt).Seconds()
		if elapsed >= float64(budgets.MaxWallSeconds) {
			return BudgetViolation{
				Dimension: "max_wall_seconds",
				Limit:     float64(budgets.MaxWallSeconds),
				Current:   elapsed,
				Message:   fmt.Sprintf("run wall time (%.1fs) exceeded limit (%ds)", elapsed, budgets.MaxWallSeconds),
			}
		}
	}

	if budgets.MaxSteps > 0 && usage.TotalSteps > budgets.MaxSteps {
		return BudgetViolation{
			Dimension: "max_steps",
			Limit:     float64(budgets.MaxSteps),
			Current:   float64(usage.TotalSteps),
			Message:   fmt.Sprintf("run steps (%d) exceeded limit (%d)", usage.TotalSteps, budgets.MaxSteps),
		}
	}

	if budgets.MaxTokens > 0 && usage.TotalTokens > budgets.MaxTokens {
		return BudgetViolation{
			Dimension: "max_tokens",
			Limit:     float64(budgets.MaxTokens),
			Current:   float64(usage.TotalTokens),
			Message:   fmt.Sprintf("run tokens (%d) exceeded limit (%d)", usage.TotalTokens, budgets.MaxTokens),
		}
	}

	if budgets.MaxCostUSD > 0 && usage.TotalCostUSD > budgets.MaxCostUSD {
		return BudgetViolation{
			Dimension: "max_cost_usd",
			Limit:     budgets.MaxCostUSD,
			Current:   usage.TotalCostUSD,
			Message:   fmt.Sprintf("run cost ($%.4f) exceeded limit ($%.4f)", usage.TotalCostUSD, budgets.MaxCostUSD),
		}
	}

	return nil
}

// CheckStepBudget checks step-level turn, token, and cost limits.
func CheckStepBudget(turns int, tokens int, costUSD float64, budgets *graph.Budgets) error {
	if budgets == nil {
		return nil
	}

	if budgets.MaxTurns > 0 && turns >= budgets.MaxTurns {
		return BudgetViolation{
			Dimension: "max_turns",
			Limit:     float64(budgets.MaxTurns),
			Current:   float64(turns),
			Message:   fmt.Sprintf("step turns (%d) reached limit (%d)", turns, budgets.MaxTurns),
		}
	}

	if budgets.MaxTokens > 0 && tokens > budgets.MaxTokens {
		return BudgetViolation{
			Dimension: "max_tokens",
			Limit:     float64(budgets.MaxTokens),
			Current:   float64(tokens),
			Message:   fmt.Sprintf("step tokens (%d) exceeded limit (%d)", tokens, budgets.MaxTokens),
		}
	}

	if budgets.MaxCostUSD > 0 && costUSD > budgets.MaxCostUSD {
		return BudgetViolation{
			Dimension: "max_cost_usd",
			Limit:     budgets.MaxCostUSD,
			Current:   costUSD,
			Message:   fmt.Sprintf("step cost ($%.4f) exceeded limit ($%.4f)", costUSD, budgets.MaxCostUSD),
		}
	}

	return nil
}
