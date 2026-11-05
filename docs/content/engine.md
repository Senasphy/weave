# Weave Engine & Execution Guide

## 1. Overview
The Weave engine executes multi-step AI workflows step by step. Every step's input, output, and execution state is saved to PostgreSQL in an append-only event log (`run_events`). 

This architecture ensures:
- **Resumability:** A workflow can pause for human approval without consuming memory or background threads.
- **Crash Recovery:** If a server or worker crashes, another worker resumes execution from the last completed step.
- **Auditability:** Complete history of every prompt, tool call, error, and decision.

---

## 2. Step Types & How They Run

### 2.1 AI Agent Steps
- **Inputs:** Takes data from incoming connections and reads any requested variables from shared workflow state.
- **Execution Loop:**
  1. Assembles the prompt: system instructions + input data + shared state values.
  2. Verifies remaining spending budget (tokens, cost, steps, time).
  3. Calls the selected LLM provider (Gemini, Claude, GPT, or local Mock).
  4. If the model calls a tool:
     - Verifies tool permissions and network safety.
     - Runs the tool and returns the response to the model turn loop (up to `max_turns`).
  5. Validates the final output against the declared `output_schema`.
     - If the output does not match, prompts the model to correct its format up to the retry limit.
  6. Writes output data to shared state.
  7. Emits `step.succeeded` and schedules subsequent steps.

### 2.2 Human Approval Gates
- Pauses workflow execution before sensitive or irreversible operations (e.g. processing a payment or sending an email).
- Transitions the run to `waiting_human` and releases worker threads immediately.
- A human can resolve the gate via the web UI or API with three choices:
  - `approve`: Continues workflow with the original payload.
  - `reject`: Halts the branch or workflow.
  - `edit`: Modifies parameters before resuming downstream steps.
- If a timeout is reached, the gate triggers its configured timeout policy (e.g. `fail` or auto-reject).

### 2.3 Conditional Routers (If / Else)
- Evaluates conditions on data produced by previous steps (e.g. `out.refund_amount > 100`).
- By default, selects the first matching branch; if none match, routes to the `default` fallback path.
- In `all_matching` mode, triggers all matching branches simultaneously.

### 2.4 Parallel Steps & Joins
- **Fan-out:** Launches independent steps concurrently to speed up workflows.
- **Join:** Gathers the results of parallel branches according to a policy:
  - `wait_all`: Waits for every parallel step to succeed before proceeding.
  - `fail_fast`: Aborts the group immediately if any branch fails.
  - `allow_partial`: Proceeds once a required threshold of steps finishes.

---

## 3. Shared State & Data Passing
Workflows maintain a shared key-value dictionary during execution. When a step writes to state, it uses one of these update strategies:
- `overwrite`: Replaces the current value with the new value.
- `append`: Appends new items to an existing list.
- `merge`: Merges fields into an existing JSON object.
- `error_on_conflict`: Aborts the run if the key already exists with a different value.

---

## 4. Spending Caps & Safety Controls
Weave enforces hard limits per step and per run to protect against infinite loops and unexpected bills:
- `max_cost_usd`: Maximum estimated dollar spend based on model pricing tables.
- `max_tokens`: Total cumulative tokens (prompt + output tokens, including internal reasoning tokens).
- `max_steps`: Total allowed step execution attempts.
- `max_wall_seconds`: Maximum allowed run duration before timing out.

If any limit is reached, Weave immediately aborts remaining work and marks the run as `budget_exceeded`.

---

## 5. Reliability & Worker Leases
- Step jobs are leased by background workers from PostgreSQL using `SELECT ... FOR UPDATE SKIP LOCKED`.
- If a worker crashes or loses network connectivity, its lease expires automatically.
- Another worker picks up the expired step, inspects the event log, and resumes execution safely.
