.PHONY: all build test dev lint clean run-backend run-frontend run-landing start

all: test build

start:
	./start.sh

build:
	go build -o bin/weave ./cmd/weave
	cd frontend && pnpm build

test:
	go test -v ./...
	cd frontend && pnpm build

dev:
	@echo "Starting local dev environment..."
	@pg_isready -h localhost -p 5433 > /dev/null 2>&1 || (echo "Starting local Postgres on port 5433..." && pg_ctl -D .dev/postgres -o "-p 5433 -k $$(pwd)/.dev/postgres" -l .dev/postgres/logfile start)
	@echo "Local services ready. Run 'make run-backend' and 'make run-frontend'."

run-backend:
	go run ./cmd/weave serve --port 8080

run-frontend:
	cd frontend && pnpm dev

run-landing:
	cd landing && pnpm dev

clean:
	rm -rf bin/ .dev/postgres/logfile
