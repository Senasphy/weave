-- 001_initial_schema.sql: Initial database schema for Weave

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    description TEXT,
    draft_graph JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    graph JSONB NOT NULL,
    semantic_hash TEXT NOT NULL,
    status TEXT NOT NULL, -- draft, published
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workflow_version UNIQUE (workflow_id, version_number)
);

-- Trigger to prevent updating or deleting published workflow versions
CREATE OR REPLACE FUNCTION prevent_published_version_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'published' THEN
        RAISE EXCEPTION 'Cannot modify or delete an immutable published workflow version.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_published_versions ON workflow_versions;
CREATE TRIGGER trg_immutable_published_versions
BEFORE UPDATE OR DELETE ON workflow_versions
FOR EACH ROW EXECUTE FUNCTION prevent_published_version_modification();

CREATE TABLE IF NOT EXISTS tools (
    id TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    kind TEXT NOT NULL, -- http, mcp, builtin
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    side_effect BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id)
);

CREATE TABLE IF NOT EXISTS secrets (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    encrypted_value BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_secret_name UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS model_prices (
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_per_mtok NUMERIC(10, 4) NOT NULL,
    output_per_mtok NUMERIC(10, 4) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider, model)
);

CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    version_id UUID REFERENCES workflow_versions(id),
    status TEXT NOT NULL, -- queued, running, waiting_human, succeeded, failed, cancelled, budget_exceeded, timed_out
    input JSONB,
    output JSONB,
    budgets JSONB,
    usage JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_workspace_status ON runs(workspace_id, status);

CREATE TABLE IF NOT EXISTS run_events (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    seq BIGINT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    step_id TEXT,
    node_id TEXT,
    payload JSONB NOT NULL,
    CONSTRAINT uq_run_seq UNIQUE (run_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_seq ON run_events(run_id, seq);

CREATE TABLE IF NOT EXISTS steps (
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    attempt INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    input JSONB,
    output JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    PRIMARY KEY (run_id, step_id, attempt)
);

CREATE TABLE IF NOT EXISTS gates (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL, -- waiting, approved, rejected, timed_out
    resolved_by TEXT,
    resolution TEXT,
    payload JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gates_status ON gates(status);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, leased, completed, failed
    lease_owner TEXT,
    lease_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_claimable ON jobs(status, lease_expires_at);

-- Seed initial workspace and user
INSERT INTO workspaces (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default Workspace')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, name) VALUES ('00000000-0000-0000-0000-000000000001', 'dev@weave.local', 'Developer')
ON CONFLICT (id) DO NOTHING;

-- Seed model prices (updated for 2026 frontier models)
INSERT INTO model_prices (provider, model, input_per_mtok, output_per_mtok) VALUES
-- OpenAI GPT-6 & Reasoning Models
('openai', 'gpt-6.1-sol', 2.0000, 10.0000),
('openai', 'gpt-6.1', 2.0000, 10.0000),
('openai', 'gpt-6-astra', 10.0000, 50.0000),
('openai', 'gpt-6-sol', 2.0000, 10.0000),
('openai', 'gpt-6-luna', 0.1000, 0.5000),
('openai', 'gpt-6', 2.0000, 10.0000),
('openai', 'gpt-5', 2.0000, 10.0000),
('openai', 'o3', 2.0000, 8.0000),
('openai', 'o3-mini', 0.5500, 2.2000),
('openai', 'o4-mini', 0.5500, 2.2000),
('openai', 'o1', 15.0000, 60.0000),
('openai', 'o1-mini', 1.1000, 4.4000),
('openai', 'gpt-4o', 2.5000, 10.0000),
('openai', 'gpt-4o-mini', 0.1500, 0.6000),
-- Anthropic Claude 5.5 & Frontier Models
('anthropic', 'claude-opus-5-5', 4.0000, 20.0000),
('anthropic', 'opus-5.5', 4.0000, 20.0000),
('anthropic', 'claude-5-5-opus', 4.0000, 20.0000),
('anthropic', 'claude-sonnet-5-5', 2.0000, 10.0000),
('anthropic', 'sonnet-5.5', 2.0000, 10.0000),
('anthropic', 'claude-5-5-sonnet', 2.0000, 10.0000),
('anthropic', 'claude-haiku-5-5', 0.5000, 2.5000),
('anthropic', 'haiku-5.5', 0.5000, 2.5000),
('anthropic', 'claude-4-opus', 5.0000, 25.0000),
('anthropic', 'claude-4-sonnet', 3.0000, 15.0000),
('anthropic', 'claude-3-7-sonnet', 3.0000, 15.0000),
('anthropic', 'claude-3-5-sonnet', 3.0000, 15.0000),
('anthropic', 'claude-3-5-sonnet-20241022', 3.0000, 15.0000),
('anthropic', 'claude-3-5-haiku', 0.8000, 4.0000),
('anthropic', 'claude-3-5-haiku-20241022', 0.8000, 4.0000),
-- Google Gemini
('gemini', 'gemini-3.8-flash', 0.7500, 3.7500),
('gemini', 'gemini-3.7-flash', 0.7500, 3.7500),
('gemini', 'gemini-3.1-pro', 2.0000, 12.0000),
('gemini', 'gemini-3.1-flash-lite', 0.2500, 1.5000),
('gemini', 'gemini-2.5-pro', 1.2500, 10.0000),
('gemini', 'gemini-2.5-flash', 0.3000, 2.5000),
-- Mock
('mock', 'mock-llm', 0.0000, 0.0000),
('mock', 'mock', 0.0000, 0.0000)
ON CONFLICT (provider, model) DO NOTHING;

-- Seed built-in tools
INSERT INTO tools (id, workspace_id, kind, config, side_effect) VALUES
('echo', '00000000-0000-0000-0000-000000000001', 'builtin', '{"description": "Echoes back the input"}'::jsonb, false),
('calculator', '00000000-0000-0000-0000-000000000001', 'builtin', '{"description": "Evaluates safe arithmetic expressions"}'::jsonb, false),
('http_request', '00000000-0000-0000-0000-000000000001', 'http', '{"description": "Performs an outbound HTTP request"}'::jsonb, true)
ON CONFLICT (workspace_id, id) DO NOTHING;
