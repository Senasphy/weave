# Weave

**Visually build, test, and run reliable AI workflows.**

Weave connects AI prompts, tools, conditional routing, and human approvals into structured, durable workflows on an interactive canvas or as declarative JSON.

---

## Key Capabilities

- **Durable Execution:** State and events persist to PostgreSQL so workflows survive restarts and worker crashes without lost progress or duplicated side-effects.
- **Human-in-the-Loop:** Pause execution for review, approval, or data edits before sensitive actions proceed.
- **Budget & Cost Caps:** Strict per-step and per-run limits on tokens, wall-clock time, and USD cost prevent runaway loops.
- **Multi-Provider Support:** Native adapters for Google Gemini, OpenAI, and Anthropic, plus zero-cost offline mock providers.

---

## Core Primitives

- **Agents:** LLM reasoning with tool calling and recursive JSON schema validation.
- **Routers:** Deterministic conditional branching evaluated via Common Expression Language (CEL).
- **Human Gates:** Non-blocking pauses for human approvals with timeout and fallback policies.
- **Fan-Out & Joins:** Concurrent branch execution with synchronized input aggregation.

---

## CLI Reference

- `weave validate <file.json>`: Validate workflow graph syntax, schemas, and budgets.
- `weave run <file.json> [--input <json>]`: Execute a workflow locally with step-by-step traces.
- `weave serve [--port 8080]`: Launch the HTTP REST and real-time SSE streaming server.
- `weave worker`: Run distributed background workers to claim and process queued jobs.
- `weave all [--port 8080]`: Run both the API server and worker in a single process.

---

## Live Deployments

- **Studio Web Application**: [https://weave-orchestrator-main.vercel.app](https://weave-orchestrator-main.vercel.app)
- **Documentation**: [https://weave-documentation.vercel.app](https://weave-documentation.vercel.app)

---

## License

MIT
