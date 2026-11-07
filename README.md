# Weave

**Visually build, test, and run reliable AI workflows.**

Weave helps you connect AI prompts, tools, conditional routing, and human approvals into structured workflows. You can build visually on an interactive canvas or edit clean JSON files. 

When your workflow runs, Weave executes it step by step, saves its progress to PostgreSQL so you never lose data if a worker restarts, pauses safely whenever a human needs to approve an action, and enforces strict spending caps so runaway loops never blow up your API bills.

---

## Why Weave?

Running multi-step AI tasks with custom scripts usually runs into the same headaches:
- **Lost state on crashes:** If a script fails halfway through, you lose all progress and have to re-run expensive LLM calls.
- **Runaway bills:** If an autonomous tool loop gets stuck, it can burn through hundreds of dollars in minutes.
- **Lack of human oversight:** High-stakes actions (issuing refunds, sending emails, deleting data) shouldn't happen automatically without a human signing off.
- **Messy glue code:** Managing prompts, retries, JSON validation, and conditional branches in code quickly becomes unmaintainable.

Weave solves this by providing a visual editor, a fast Go execution engine, and built-in safety controls.

---

## Core Building Blocks

Every workflow is composed of 4 simple step types:

1. **AI Agent Steps:**
   - Calls an LLM (Google Gemini, OpenAI, Anthropic, or a zero-cost local test mock).
   - Can use safe tools (like web search or internal HTTP APIs).
   - Automatically validates output against your requested JSON format.

2. **Conditional Routers (If / Else):**
   - Routes execution down different branches based on data from previous steps (e.g. `refund_amount > 100`).

3. **Human Approval Gates:**
   - Pauses execution and waits for a human to review, approve, reject, or edit data before sensitive actions proceed.
   - Releases server resources while waiting; workflows can pause for minutes or days without keeping background threads alive.

4. **Parallel Steps & Joins:**
   - Runs independent tasks simultaneously (e.g. querying three documents at once) and merges their results.

---

## Safety & Cost Controls

- **Hard Spending Caps:** Set strict limits per step and per run on tokens, steps, time, and estimated dollar costs. If a workflow exceeds its budget, it stops immediately.
- **Crash Recovery:** Every step logs its input, output, and status to PostgreSQL. If a machine reboots or crashes, the run resumes from the last completed step without duplicating external actions.
- **Full Execution Traces:** Inspect every prompt, tool call, latency, and token count with real-time logs and step timelines.

---

## Architecture

```
Web App (Next.js 15)
  ├── Visual canvas editor (React Flow)
  ├── Live execution viewer & real-time event logs
  └── Human approvals inbox
        │ REST (OpenAPI 3.1) + SSE streams
        ▼
Go Backend (Single binary: api | worker | all)
  ├── api/      HTTP handlers & SSE event stream
  ├── graph/    Workflow validation & condition compiler
  ├── engine/   Step scheduler, prompt builder, budget enforcement
  ├── llm/      Model adapters (Gemini, OpenAI, Anthropic, Mock)
  ├── tools/    Tool runners with network safety checks
  └── store/    Postgres event log & durable job queue
        ▼
PostgreSQL 15+ (Single persistent database)
```

---

## Quickstart

### Prerequisites
- **Go 1.23+**
- **Node.js 20+ & pnpm**
- **PostgreSQL 15+** (or Docker)

### 1. Check a Workflow for Errors
```bash
go run ./cmd/weave validate examples/support_triage.json
```

### 2. Test Run Locally (No External API Keys Needed)
The repository includes a built-in mock LLM so you can test complete workflows offline without spending money:
```bash
go run ./cmd/weave run examples/support_triage.json --input '{"ticket": "Customer requesting $150 refund"}'
```

### 3. Start the API Server
```bash
export DATABASE_URL="postgres://postgres:password@localhost:5432/weave?sslmode=disable"
go run ./cmd/weave serve --port 8080
```

### 4. Start the Web UI
```bash
cd web
pnpm install
pnpm dev
# Open http://localhost:3000 in your browser
# Or access the hosted Studio at https://weave-orchestrator-main.vercel.app
```

---

## Live Deployments

- **Studio Web Application**: [https://weave-orchestrator-main.vercel.app](https://weave-orchestrator-main.vercel.app)
- **Documentation**: [https://weave-documentation.vercel.app](https://weave-documentation.vercel.app)
- **Marketing & Overview**: [https://weave-orchestrator.vercel.app](https://weave-orchestrator.vercel.app)

---

## CLI Reference

- `weave validate <file.json>`: checks a workflow file for errors and missing fields.
- `weave run <file.json> [--input <json>]`: executes a workflow locally and prints step-by-step progress.
- `weave serve [--port 8080]`: launches the REST API and live event streaming server.
- `weave worker`: runs background queue workers to process queued workflow steps.
- `weave all [--port 8080]`: runs both the API server and worker in a single process (ideal for local development).

---

## License
MIT
