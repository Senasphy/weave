"use client";

import { DocsLayout } from "@/components/DocsLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const composeYaml = `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: weave-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: weave
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d weave"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: weave-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgres://postgres:password@postgres:5432/weave?sslmode=disable"
      PORT: "8080"
    ports:
      - "8080:8080"

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: weave-web
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:8080/v1"
    ports:
      - "3000:3000"

volumes:
  pgdata:`;

export default function DeploymentPage() {
  const toc = [
    { id: "overview", title: "Topology" },
    { id: "docker", title: "Docker Compose" },
    { id: "configuration", title: "Configuration" },
    { id: "production", title: "Production" },
  ];

  return (
    <DocsLayout
      toc={toc}
      currentSection="Reference"
      currentPage="Deployment"
      previousPage={{ title: "Visual Editor", href: "/visual-editor" }}
    >
      <h1>Deployment</h1>
      <p className="text-lg !mt-0 text-muted-foreground">
        Run Weave with Docker Compose, Kubernetes, or standalone instances.
      </p>

      <section id="overview">
        <h2>Architecture topology</h2>
        <p>
          Stateful concerns stay in PostgreSQL 15+, which holds immutable event logs (
          <code>run_events</code>) and the durable job queue.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <div className="font-medium text-foreground">API pods</div>
            <p className="!mt-1 text-sm">REST, schema validation, SSE fan-out. Stateless.</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="font-medium text-foreground">Worker pods</div>
            <p className="!mt-1 text-sm">Lease steps, call LLMs, run tools, fold state.</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="font-medium text-foreground">Postgres</div>
            <p className="!mt-1 text-sm">Workflows, versions, events, and leases.</p>
          </div>
        </div>
      </section>

      <section id="docker">
        <h2>Docker Compose</h2>
        <p>
          The repository includes a compose file for Postgres, the API, and the Next.js editor:
        </p>
        <CodeBlock code="docker compose up -d --build" language="bash" filename="Terminal" />
        <CodeBlock code={composeYaml} language="yaml" filename="docker-compose.yml" />
      </section>

      <section id="configuration">
        <h2>Configuration</h2>
        <p>
          Provide credentials via environment variables or a <code>.env</code> file:
        </p>
        <CodeBlock
          code={`# PostgreSQL connection string
DATABASE_URL=postgres://postgres:password@localhost:5432/weave?sslmode=disable

# Optional LLM credentials (required if not using mock provider)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Server configuration
PORT=8080
LOG_LEVEL=info`}
          language="bash"
          filename=".env"
        />
        <Callout type="tip" title="Migrations">
          The Go service applies pending schema migrations from <code>migrations/</code> on
          startup before accepting traffic.
        </Callout>
      </section>

      <section id="production">
        <h2>Production notes</h2>
        <ul>
          <li>
            Scale workers from pending rows in{" "}
            <code>step_jobs WHERE status = &apos;queued&apos;</code>.
          </li>
          <li>Place PgBouncer in transaction mode beyond ~20 worker pods.</li>
          <li>
            Block worker egress to cloud metadata endpoints such as <code>169.254.169.254</code>.
          </li>
        </ul>
      </section>
    </DocsLayout>
  );
}
