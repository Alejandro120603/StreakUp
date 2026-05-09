# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All common tasks are wrapped in the Makefile. Run from the repo root.

```bash
# Development
make dev                    # Run backend + frontend concurrently
make run_backend            # Flask dev server on :5000
make run_frontend           # Next.js dev server (proxies to :5000)
make run_local              # Frontend in offline mode (no backend needed)

# Testing
make test_backend           # pytest (uses in-memory SQLite automatically)
make test_frontend_unit     # Node test runner (no framework)
make test_frontend_e2e      # Playwright E2E tests
make lint_frontend          # ESLint

# Database
make db-init                # Create SQLite from schema.sql
make db-init-demo           # Create SQLite + seed demo users
make db-bootstrap-catalog   # Seed habit catalog (idempotent)
make db-reset               # Drop and recreate database
make db-open                # Open SQLite CLI on data/app.db

# Mobile
make build_frontend_mobile  # Export for Capacitor
make sync_android           # Sync to Android project
make build_apk              # Build debug APK
```

**Run a single backend test:**
```bash
cd backend && .venv/Scripts/python -m pytest tests/path/to/test_file.py::test_name -v
```

**Run a single frontend unit test:**
```bash
cd frontend && npm test -- --test-name-pattern="test description"
```

## Environment Setup

**Backend** — copy `backend/.env` and create `backend/.env.local` for secrets:
- `SECRET_KEY` and `JWT_SECRET_KEY` (32+ chars in production)
- `DATABASE_URL` defaults to `data/app.db` (SQLite) if unset
- `OPENAI_API_KEY` only needed for photo/AI validation feature

**Frontend** — create `frontend/.env.local`:
- `NEXT_DEV_API_PROXY_URL=http://localhost:5000` for dev proxy
- `NEXT_PUBLIC_OFFLINE_MODE=true` to work without backend
- `NEXT_PUBLIC_API_URL` for pointing at a hosted backend

## Architecture

### Backend — Flask Service Layer

The backend uses an **application factory** (`backend/app/__init__.py`) that registers 11 blueprints under `/api/*`. The request flow is strictly:

```
Route → Service → Model → Database
```

Routes only handle HTTP concerns (parsing, response formatting). All business logic lives in `app/services/`. Models are pure SQLAlchemy ORM classes with no logic.

Key architectural decisions:
- **JWT with JTI blocklist**: logout revokes tokens by storing their JTI in `token_blocklist` table. The blocklist loader is wired into `extensions.py`.
- **SQLite ↔ PostgreSQL**: `DATABASE_URL` is normalized in `config.py` (`postgres://` → `postgresql+psycopg://`). Dev uses SQLite, prod uses PostgreSQL. Alembic manages migrations (not `schema.sql`).
- **Idempotent sync**: the `sync_operations` table stores `client_operation_id` UUIDs so replayed client operations are safe. `POST /api/sync` accepts a batch of operations and returns per-operation status (`acked`, `failed`, `retryable`).
- **Test isolation**: `backend/conftest.py` patches `DATABASE_URL` to `sqlite:///:memory:` before the Flask app is imported, so tests never touch the real database.

### Frontend — Offline-First Next.js + Capacitor

The app is organized as a Next.js App Router project compiled for web and wrapped in Capacitor for mobile.

**Offline-first pattern:**
1. User actions are written to a local sync queue (`services/sync/syncQueue.ts`)
2. `drainSyncQueue()` in `services/sync/syncService.ts` replays queued operations to `POST /api/sync`
3. Local state (IndexedDB/memory via `services/storage/offlineDb.ts`) is updated optimistically

**API layer** (`services/api/client.ts`): a thin fetch wrapper that injects `Authorization: Bearer <token>` headers, checks offline mode before network calls, and normalizes errors into typed `AppError` objects with codes: `offline_mode`, `network_unavailable`, `backend_unavailable`, `auth_required`, `validation_error`, `api_error`.

**Auth tokens** are stored in localStorage via `services/auth/session.ts` and read by the API client on every request. Refresh tokens are used to renew access tokens on 401 responses.

**Route structure** (App Router):
- `app/(auth)/` — login, register (no layout shell)
- `app/(dashboard)/` — habits, stats, pomodoro, social, profile, validate (with nav shell)

**State management** is minimal — a small Redux-like store (`state/store.ts`) only tracks `app.initialized`. Most state is fetched fresh from the API or read from local storage.

### Database

- **Dev**: `data/app.db` (SQLite, created by `make db-init`)
- **Prod**: PostgreSQL managed via Alembic (`flask db upgrade`)
- `schema.sql` is only used for local SQLite bootstrapping — never in production
- `flask seed-catalog` / `make db-bootstrap-catalog` seeds the habit catalog idempotently

### Key Models to Know

| Model | Notes |
|---|---|
| `UserHabit` | Join between `User` and catalog `Habit`; has `is_active`, schedule info |
| `CheckIn` | One per user per habit per day; toggling the same day deletes it |
| `XpLog` | Append-only ledger; `users.total_xp` is derived from this |
| `SyncOperation` | Receipt table for idempotent client operation replay |
| `TokenBlocklist` | Stores JTIs of logged-out tokens |
