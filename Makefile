.PHONY: all build test dev lint clean run-backend run-web run-www run-docs start

all: test build

start:
	./start.sh

build:
	go build -o bin/weave ./cmd/weave
	cd web && pnpm build
	cd www && pnpm build
	cd docs && pnpm build

test:
	go test -v ./...
	cd web && pnpm build

dev:
	@echo "Starting local dev environment..."
	@pg_isready -h localhost -p 5433 > /dev/null 2>&1 || (echo "Starting local Postgres on port 5433..." && pg_ctl -D .dev/postgres -o "-p 5433 -k $$(pwd)/.dev/postgres" -l .dev/postgres/logfile start)
	@echo "Local services ready. Run 'make run-backend', 'make run-web', 'make run-www', or 'make run-docs'."

run-backend:
	go run ./cmd/weave serve --port 8080

run-web:
	cd web && pnpm dev

run-www:
	cd www && pnpm dev

run-docs:
	cd docs && pnpm dev

clean:
	rm -rf bin/ .dev/postgres/logfile
