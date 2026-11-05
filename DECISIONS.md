# Architecture Decision Records (ADRs) - Weave

## ADR-001: Graph JSON Schema as Single Source of Truth
- **Status**: Accepted
- **Context**: The graph definition must be shared between the visual editor (Next.js/TypeScript) and the execution engine (Go). Drift between the two causes silent failures.
- **Decision**: Define authoritative JSON Schema at `schema/workflow.schema.json`. Use it for server-side validation (`santhosh-tekuri/jsonschema/v5`) and generate TypeScript interfaces for the web client. The server validator is the sole authority on semantic validity; the client performs only cheap structural checks and displays server diagnostics.

## ADR-002: OpenAPI 3.1 Spec-First Contract
- **Status**: Accepted
- **Context**: Need a strict, typed API contract between Go backend and Next.js web app with zero duplicated hand-written types.
- **Decision**: Define OpenAPI 3.1 at `api/openapi.yaml`. Generate TypeScript client and types using `openapi-typescript` and `openapi-fetch`. Keep the spec synchronized with the Go HTTP handlers.

## ADR-003: Pure Interface Engine Architecture
- **Status**: Accepted
- **Context**: The execution engine must be embeddable, easily unit-testable with fakes, and decoupled from persistence and network dependencies.
- **Decision**: `engine` package imports no HTTP or database libraries. It depends strictly on interfaces: `Store`, `LLM`, `ToolRunner`, `Clock`, and `IDGen`. All non-deterministic sources (LLM responses, tool calls, timestamps, UUID generation) pass through these interfaces and are recorded as immutable run events.

## ADR-004: Event Sourcing & Durable Execution Model
- **Status**: Accepted
- **Context**: Runs must survive worker crashes and process restarts, allow pause/resume for human gates lasting days, and support deterministic replay.
- **Decision**: Run state is a fold of its append-only events (`run_events` table with monotonic `seq`). Steps are claimed via Postgres `SELECT ... FOR UPDATE SKIP LOCKED` with lease heartbeats. Crash recovery reloads events and resumes uncompleted ready steps without duplicate side effects.

## ADR-005: CEL (Common Expression Language) for Edge Conditions & Mappings
- **Status**: Accepted
- **Context**: Edge conditions (`when`) and data mappings (`to_input`) must be safe, sandboxed, deterministic, and non-Turing-complete.
- **Decision**: Use Google's `cel-go`. Expressions are compiled and type-checked during graph validation. Edge evaluation has access to `state` and source node `out`.

## ADR-006: Initial LLM Adapters and Price Table
- **Status**: Accepted
- **Context**: Need at least two real providers behind a common interface plus a zero-cost deterministic mock provider for tests and fixtures.
- **Decision**: Implement adapters for OpenAI and Anthropic, alongside a deterministic `MockLLMProvider` using recorded responses/fixtures. Maintain a versioned model price table in Go with input/output token pricing. Graphs referencing models missing from the price table fail validation.

## ADR-007: Event Log Payload Size Cap and Redaction
- **Status**: Accepted
- **Context**: Storing large LLM prompts and tool payloads can bloat Postgres and leak secrets.
- **Decision**: Truncate LLM prompt/response storage at 64KB per payload, noting truncation in event metadata. Pass all logged strings through a redaction hook that scrubs secrets matched against `${secret:NAME}` definitions and known sensitive key patterns.

## ADR-008: Human Gates Pausing Semantics
- **Status**: Accepted
- **Context**: Gate nodes require human intervention (approve, reject, edit) that must survive restarts and handle races safely.
- **Decision**: Reaching a gate transitions the run to `waiting_human` and releases worker leases. Gate resolutions (`POST /v1/gates/{id}/resolve`) use conditional optimistic concurrency (`WHERE status = 'waiting'`) returning 409 Conflict if already resolved. Timeouts are checked by the scheduler and emit `gate.timed_out`.

## ADR-009: Modern Multi-Provider Ecosystem & Reasoning Token Accounting (2026)
- **Status**: Accepted
- **Context**: The LLM ecosystem has matured with reasoning and frontier models (OpenAI's `gpt-6.1-sol`, `gpt-6-astra`, `o3`; Anthropic's `opus-5.5`, `sonnet-5.5`; Google's `gemini-3.8-flash`, `gemini-3.1-pro`) where chain-of-thought and thinking tokens are billed as output tokens. Hard budgets must account for dynamic reasoning tokens and modern price tables.
- **Decision**:
  1. Add native `GeminiProvider` utilizing Google AI Studio's API (`GEMINI_API_KEY`).
  2. Expand `DefaultModelPriceTable` and database schema seeds with up-to-date 2026 pricing across OpenAI (GPT-6.1 Sol, GPT-6 Astra, o3), Anthropic (Opus 5.5, Sonnet 5.5), and Google Gemini (3.8 Flash, 3.1 Pro).
  3. Unify validator known model checks via `llm.KnownModelKeys()` to prevent validation drift between the CLI, REST API, and pricing table.
  4. Explicitly account for reasoning/thinking tokens within per-step and per-run token and cost budgets.
  5. Expand visual editor inspector and JSON schema to support `gemini` and modern model selection.
