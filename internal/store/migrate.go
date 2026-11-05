package store

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/001_initial_schema.sql
var initialSchemaSQL string

//go:embed migrations/002_auth_schema.sql
var authSchemaSQL string

// RunMigrations executes initial database migrations with a distributed advisory lock.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection for migrations: %w", err)
	}
	defer conn.Release()

	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin migration transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Acquire exclusive advisory lock for Weave migrations (hash of "weave_migrations")
	const migrationLockID = 74218934571
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", migrationLockID); err != nil {
		return fmt.Errorf("failed to acquire migration advisory lock: %w", err)
	}

	if _, err := tx.Exec(ctx, initialSchemaSQL); err != nil {
		return fmt.Errorf("initial schema migration failed: %w", err)
	}

	if _, err := tx.Exec(ctx, authSchemaSQL); err != nil {
		return fmt.Errorf("auth schema migration failed: %w", err)
	}

	return tx.Commit(ctx)
}
