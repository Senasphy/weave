#!/usr/bin/env bash
set -e

# Base directory of the repository
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Array to hold allocated ports in this session to prevent collisions
ALLOCATED_PORTS=()

# Array to hold background PIDs for cleanup on exit
SERVICE_PIDS=()

# Directory for service logs
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

# Check if a TCP port is currently listening
is_port_in_use() {
  local port=$1
  for p in "${ALLOCATED_PORTS[@]}"; do
    if [ "$p" -eq "$port" ]; then
      return 0
    fi
  done

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1
  elif command -v ss >/dev/null 2>&1; then
    ss -tlpn | grep -q ":$port "
  elif command -v nc >/dev/null 2>&1; then
    nc -z localhost "$port" >/dev/null 2>&1
  else
    # Fallback using /dev/tcp
    (echo > /dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
  fi
}

# Find preferred port, or next available sequential port if busy
find_available_port() {
  local preferred=$1
  local service_name=$2
  local port=$preferred

  while is_port_in_use "$port"; do
    port=$((port + 1))
  done

  ALLOCATED_PORTS+=("$port")

  if [ "$port" -ne "$preferred" ]; then
    echo "  [Notice] Preferred port $preferred for $service_name is in use -> switched to port $port" >&2
  fi

  echo "$port"
}

# Clean shutdown handler
CLEANED_UP=0
cleanup() {
  if [ "$CLEANED_UP" -eq 1 ]; then
    return
  fi
  CLEANED_UP=1

  echo ""
  echo "Shutting down all Weave services..."
  for pid in "${SERVICE_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  echo "All services stopped."
}

trap cleanup INT TERM EXIT

echo "=========================================================="
echo "          Starting Weave Development Environment          "
echo "=========================================================="
echo ""

# 1. Start or Verify PostgreSQL
if [ -z "$DATABASE_URL" ]; then
  if ! pg_isready -h localhost -p 5433 >/dev/null 2>&1; then
    if [ -d "$ROOT_DIR/.dev/postgres" ]; then
      echo "[1/5] Starting local PostgreSQL (port 5433)..."
      pg_ctl -D "$ROOT_DIR/.dev/postgres" \
        -o "-p 5433 -k $ROOT_DIR/.dev/postgres" \
        -l "$ROOT_DIR/.dev/postgres/logfile" start >/dev/null 2>&1 || true
      sleep 1
    fi
  fi

  if pg_isready -h localhost -p 5433 >/dev/null 2>&1; then
    echo "[1/5] Database: Local PostgreSQL connected on port 5433"
  else
    echo "[1/5] Database: Warning - local Postgres on port 5433 not ready. Will use default fallback."
  fi
else
  echo "[1/5] Database: Using remote DATABASE_URL"
fi

# 2. Build backend binary if not present
if [ ! -f "$ROOT_DIR/bin/weave" ]; then
  echo "[i] Compiling backend binary..."
  go build -o "$ROOT_DIR/bin/weave" ./cmd/weave
fi

# 3. Determine Ports dynamically
echo "[2/5] Allocating ports..."
BACKEND_PORT=$(find_available_port 8080 "Backend API")
FRONTEND_PORT=$(find_available_port 3000 "Main Frontend")
LANDING_PORT=$(find_available_port 3001 "Landing Page")
DOCS_PORT=$(find_available_port 3010 "Docs Site")

# 4. Start Services
echo "[3/5] Starting services in background..."

# Backend (API + Worker)
"$ROOT_DIR/bin/weave" all --port "$BACKEND_PORT" > "$LOG_DIR/backend.log" 2>&1 &
SERVICE_PIDS+=($!)

# Main Frontend (passes dynamically chosen backend port)
(
  cd "$ROOT_DIR/frontend"
  NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT" \
  pnpm exec next dev --port "$FRONTEND_PORT" --turbopack > "$LOG_DIR/frontend.log" 2>&1
) &
SERVICE_PIDS+=($!)

# Landing Page
(
  cd "$ROOT_DIR/landing"
  pnpm exec next dev --port "$LANDING_PORT" > "$LOG_DIR/landing.log" 2>&1
) &
SERVICE_PIDS+=($!)

# Docs Site
(
  cd "$ROOT_DIR/docs-site"
  pnpm exec next dev --port "$DOCS_PORT" > "$LOG_DIR/docs.log" 2>&1
) &
SERVICE_PIDS+=($!)

# 5. Wait briefly and report URLs
echo "[4/5] Waiting for services to initialize..."
sleep 3

echo ""
echo "=========================================================="
echo "              All Weave Services Are Running              "
echo "=========================================================="
echo ""
printf "  %-22s : %s\n" "Backend API & Worker" "http://localhost:$BACKEND_PORT"
printf "  %-22s : %s\n" "Main Web App (Editor)" "http://localhost:$FRONTEND_PORT"
printf "  %-22s : %s\n" "Landing Page"         "http://localhost:$LANDING_PORT"
printf "  %-22s : %s\n" "Docs Site"            "http://localhost:$DOCS_PORT"
echo ""
echo "  Backend connected    : http://localhost:$BACKEND_PORT -> Neon / Local Postgres"
echo "  Frontend targeting   : http://localhost:$BACKEND_PORT"
echo "  Service logs stored  : $LOG_DIR/*.log"
echo ""
echo "Press [Ctrl+C] to stop all services."
echo "=========================================================="
echo ""

# Keep running until user terminates
wait
