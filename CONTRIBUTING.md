# Contributing to Weave

Thank you for your interest in contributing to Weave! Weave is an open-source visual multi-agent workflow orchestration engine built with Go, PostgreSQL, and Next.js.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Be respectful and constructive in all interactions across issues, pull requests, and discussions.

---

## Repository Layout

```
weave/
├── cmd/             # Go command-line entry points (weave validate, run, serve, all)
├── internal/        # Go engine, api, graph, llm, store, and tools
├── web/             # Next.js 15 visual workflow editor & canvas (React Flow)
├── www/             # Next.js marketing website
├── docs/            # Next.js documentation portal & content/
├── deploy/          # Docker Compose, Dockerfile, and cloud deployment configs
├── api/             # OpenAPI 3.1 specifications (openapi.yaml)
├── schema/          # JSON Schema for workflows (workflow.schema.json)
├── examples/        # Sample workflow definitions
└── assets/          # Canonical branding assets and logos
```

---

## Development Setup

### Prerequisites
- **Go**: 1.23 or newer
- **Node.js**: 20.x or newer
- **pnpm**: 9.x or newer (`corepack enable && corepack prepare pnpm@latest --activate`)
- **PostgreSQL**: 15+ (local, Docker, or Neon Serverless)

### 1. Backend (Go)

```bash
# Clone the repository
git clone https://github.com/Senasphy/weave.git
cd weave

# Run unit and integration tests
go test -v ./...

# Build the CLI binary
go build -o bin/weave ./cmd/weave

# Validate an example workflow
./bin/weave validate examples/support_triage.json

# Test a workflow offline with zero API costs using the mock LLM
./bin/weave run examples/support_triage.json --input '{"ticket": "Customer requesting $150 refund"}'
```

### 2. Frontend Applications (Next.js)

```bash
# Main Visual Studio Canvas
cd web
pnpm install
pnpm dev

# Marketing Website
cd ../www
pnpm install
pnpm dev

# Documentation Portal
cd ../docs
pnpm install
pnpm dev
```

---

## Pull Request Process

1. **Fork & Branch**: Create a descriptive feature branch from `main` (e.g. `feature/parallel-joins` or `fix/cel-evaluator`).
2. **Follow Architectural Conventions**:
   - Engine logic belongs in `internal/engine/`.
   - Persistence changes belong in `internal/store/` with migrations embedded in `internal/store/migrations/`.
   - Never duplicate hand-crafted types between Go and TypeScript; ensure `schema/workflow.schema.json` and `api/openapi.yaml` remain authoritative.
3. **Run Tests**:
   Ensure all tests pass before opening a PR:
   ```bash
   make test
   ```
4. **Open Pull Request**:
   - Provide a clear description of what changed and why.
   - Reference any relevant issues.
   - Ensure the automated GitHub Actions CI workflow passes.

---

## Reporting Issues

- **Bug Reports**: Open an issue detailing your OS, Go version, steps to reproduce, and relevant logs.
- **Feature Requests**: Open an issue or discussion explaining the use case and proposed design.
- **Security Vulnerabilities**: Please report vulnerabilities privately to the maintainers via GitHub Security Advisories.
