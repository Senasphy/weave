package store

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/001_initial_schema.sql
var initialSchemaSQL string

// RunMigrations executes initial database migrations.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, initialSchemaSQL)
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}
	return nil
}
