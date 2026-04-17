# StreakUP PostgreSQL + Render Migration Readiness Report

Date: 2026-04-11

## 1. Executive Summary

This report captures the backend and database readiness audit for the StreakUP migration path:

1. clean backend/database logic
2. migrate SQLite schema/data to PostgreSQL
3. deploy PostgreSQL on Render
4. deploy backend on Render
5. point frontend/APK to the hosted backend

Initial verdict before implementation: **not safe to migrate**.

Primary causes:

- the Alembic history was SQLite-specific and not a valid PostgreSQL bootstrap path
- the schema contract was split across `schema.sql`, ORM models, and Alembic with real drift
- write flows around check-ins, XP, and validation were not atomic
- configuration still assumed local/SQLite-oriented behavior in places that matter for hosted Postgres
- the legacy SQLite dataset already contained XP drift relative to `xp_logs`

Current verdict after implementation: **safe to proceed to a staging PostgreSQL migration and Render smoke test**.

This is a staging go, not a production go. A real PostgreSQL instance and hosted backend still need to be exercised before release.

## 2. Architecture Summary

### Backend structure

- Flask app factory in `backend/app/__init__.py`
- runtime configuration in `backend/app/config.py`
- SQLAlchemy, Flask-Migrate, JWT, and CORS integration through the app factory and extensions
- service-driven DB write paths for auth, habits, check-ins, stats, validation, Pomodoro, and XP
- operational endpoints for health and readiness

### Database structure

- local SQLite convenience schema in `data/db/schema.sql`
- local SQLite convenience seed in `data/db/seed.sql`
- canonical runtime schema path through Alembic in `backend/migrations/versions/`
- ORM models under `backend/app/models/`
- hosted catalog bootstrap through the backend rather than raw SQL

### Core tables

- `users`
- `xp_logs`
- `categorias`
- `habitos`
- `habitos_usuario`
- `registro_habitos`
- `validaciones`
- `pomodoro_sessions`
- `niveles`

## 3. Current Verdict

### Before fixes

**Not safe to migrate.**

Main blockers:

- SQLite-only Alembic revisions
- schema drift between ORM, `schema.sql`, and migrations
- partial commits in critical write flows
- SQLite-fragile query behavior around dates and validations
- missing Postgres driver/runtime config hardening
- live-data inconsistencies in the current SQLite DB

### After fixes

**Safe to proceed to staging migration and hosted smoke testing.**

Remaining release gates:

- run the migration against a real PostgreSQL database
- run the backend on a Render-like hosted environment
- validate frontend/mobile traffic against the hosted backend

## 4. Findings by Severity

## Critical

### C1. SQLite-only Alembic history

Original problem:

- the baseline revisions used raw SQLite DDL and SQLite-specific behavior
- `flask db upgrade` was not a trustworthy bootstrap path for PostgreSQL

Resolution:

- rewrote `backend/migrations/versions/0001_initial_baseline.py`
- rewrote `backend/migrations/versions/0002_add_pomodoro_sessions.py`
- both revisions now use portable Alembic operations with SQLAlchemy types and constraints

Status: fixed

### C2. Schema drift across ORM, SQL schema, and migrations

Original problem:

- uniqueness, defaults, indexes, and constraints did not match across the three schema sources
- different initialization paths could yield materially different databases

Resolution:

- aligned model and DDL contracts across:
  - `backend/app/models/*.py`
  - `data/db/schema.sql`
  - Alembic revisions
- examples fixed:
  - `users.username` uniqueness/index parity
  - category uniqueness parity
  - `xp_logs.fuente` constraint alignment
  - Pomodoro and validation constraints
  - user XP field constraints/defaults

Status: fixed

### C3. Legacy SQLite data drift

Audit result from `data/app.db`:

- optional tables such as `pomodoro_sessions` were absent in the source DB
- at least one stored user XP state did not match the ledger in `xp_logs`
- example found during audit: `Daniel` had stored total XP higher than the sum of imported XP logs

Why this mattered:

- migrating raw user totals as-is would preserve incorrect state

Resolution:

- added `audit-legacy-sqlite`
- added `migrate-sqlite-to-postgres`
- migration now recomputes `users.total_xp`, `level`, and `xp_in_level` from `xp_logs`

Status: fixed in the migration path

## High

### H1. Non-atomic check-in and XP writes

Original problem:

- check-in creation/removal and XP award/revoke were committed in separate steps
- a mid-flow failure could leave check-ins and XP out of sync

Resolution:

- centralized XP helpers now support `commit=False`
- `checkin_service` performs one transactional commit and rolls back on failure
- undo flow now uses canonical `checkin_undo`

Status: fixed

### H2. Non-atomic validation flow

Original problem:

- validation could partially commit check-in, XP, and validation-log records

Resolution:

- `validation_service` now treats the flow as one transaction with rollback on failure

Status: fixed

### H3. PostgreSQL-fragile date handling

Original problem:

- several queries compared dates by relying on SQLite-friendly coercion patterns

Resolution:

- moved to typed SQLAlchemy date expressions in stats, XP, and validation paths

Status: fixed

### H4. Validation evidence stored raw image payloads in the database

Original problem:

- raw base64 evidence was a poor fit for hosted PostgreSQL storage

Resolution:

- validation logs no longer persist the raw image payload
- current behavior stores the validation event without saving base64 media into the transactional DB row

Status: fixed

## Medium

### M1. Missing PostgreSQL driver/runtime config path

Original problem:

- `requirements.txt` did not include a Postgres driver
- database URL normalization and hosted engine options were missing

Resolution:

- added `psycopg[binary]`
- added `normalize_database_url()`
- added non-SQLite engine options such as `pool_pre_ping`

Status: fixed

### M2. Production CORS was too permissive

Original problem:

- production behavior was effectively wildcard-oriented

Resolution:

- added `CORS_ALLOWED_ORIGINS`
- production/runtime CORS is now env-driven, with dev/test remaining permissive where appropriate

Status: fixed

### M3. Seed/bootstrap path mixed local SQLite behavior with hosted expectations

Original problem:

- `seed.sql` is SQLite-oriented and should not be the hosted bootstrap mechanism

Resolution:

- documented `data/db/schema.sql` and `data/db/seed.sql` as local SQLite convenience only
- clarified hosted path: `flask db upgrade` followed by backend seed/catalog commands

Status: fixed operationally

### M4. Input validation gaps on some write paths

Original problem:

- some route/service paths accepted fragile payloads and relied on DB failures later

Resolution:

- added explicit integer validation in check-in and habit assignment routes
- hardened Pomodoro input validation and ownership checks
- expanded tests around invalid payloads and foreign habit references

Status: fixed

## Low

### L1. Dead or low-signal schema remains

Current state:

- `niveles` still exists but is not central to current runtime behavior

Impact:

- not a migration blocker
- still worth future cleanup if the application continues to derive levels directly from XP logic

Status: left unchanged

### L2. Local SQL remains SQLite-only by design

Current state:

- `data/db/schema.sql` and `data/db/seed.sql` remain local SQLite helpers

Impact:

- acceptable as long as hosted environments use Alembic and backend seed flows only

Status: documented

## 5. Migration Blockers

Issues that had to be addressed before PostgreSQL/Render:

- SQLite-only Alembic revisions: fixed
- schema drift across schema sources: fixed
- non-atomic DB write flows: fixed
- PostgreSQL-fragile date/query behavior: fixed
- missing Postgres driver and URL normalization: fixed
- permissive production CORS: fixed
- legacy SQLite XP drift: fixed by audit/import reconciliation

Issues still open before production release:

- run the migration on a real PostgreSQL instance
- run hosted startup and readiness checks on Render
- confirm connected frontend/mobile smoke tests against the hosted backend

## 6. Changes Applied

### 6.1 Config and deploy readiness

Files:

- `backend/app/config.py`
- `backend/app/__init__.py`
- `backend/requirements.txt`
- `backend/.env.example`
- `README.md`

What changed:

- normalized Render-style Postgres URLs to SQLAlchemy-safe URLs
- added hosted engine options for non-SQLite connections
- added env-driven `CORS_ALLOWED_ORIGINS`
- documented hosted bootstrapping and preserved-data migration steps

### 6.2 Canonical migration path

Files:

- `backend/migrations/versions/0001_initial_baseline.py`
- `backend/migrations/versions/0002_add_pomodoro_sessions.py`

What changed:

- replaced raw SQLite-oriented revision logic with portable Alembic operations
- aligned constraints, indexes, defaults, and foreign keys with runtime models

### 6.3 Legacy SQLite audit/import tooling

Files:

- `backend/app/cli.py`
- `backend/app/services/legacy_sqlite_migration_service.py`

What changed:

- added `flask audit-legacy-sqlite --path ...`
- added `flask migrate-sqlite-to-postgres --path ...`
- import path reads legacy SQLite data, migrates explicit IDs, repairs XP-derived user state, and reseeds Postgres sequences when needed

### 6.4 Runtime write consistency

Files:

- `backend/app/services/xp_service.py`
- `backend/app/services/checkin_service.py`
- `backend/app/services/validation_service.py`

What changed:

- canonical XP reasons are enforced
- user totals can be recomputed deterministically from `xp_logs`
- check-in and validation writes commit once and roll back safely on failure

### 6.5 Model and query contract alignment

Files:

- `backend/app/models/user.py`
- `backend/app/models/user_habit.py`
- `backend/app/models/habit.py`
- `backend/app/models/checkin.py`
- `backend/app/models/validation_log.py`
- `backend/app/models/pomodoro_session.py`
- `backend/app/models/xp_log.py`
- `backend/app/services/stats_service.py`
- `backend/app/services/pomodoro_service.py`
- `backend/app/routes/checkin_routes.py`
- `backend/app/routes/habit_routes.py`
- `data/db/schema.sql`
- `data/db/seed.sql`

What changed:

- aligned constraints and defaults
- tightened input validation
- made date filtering and stats behavior portable
- kept local SQLite helpers explicitly non-canonical for hosted deploys

## 7. Diff Summary and Why Each Change Was Necessary

### Portable Alembic revisions

Why:

- PostgreSQL deployment depends on `flask db upgrade` being the schema source of truth

### Audit/import CLI for legacy SQLite

Why:

- the current `data/app.db` cannot be trusted as-is for user XP totals
- import needs a deterministic transform step, not a raw copy

### Canonical XP reasons and recomputation

Why:

- user-level XP fields are derived data
- the log must be the ledger
- migration and runtime code now agree on that rule

### Transaction-safe write flows

Why:

- hosted database failures must not leave partial state

### Hosted config hardening

Why:

- Postgres URLs, connection health, and production CORS all need explicit runtime handling

## 8. Validation Performed

Commands run during implementation:

```bash
cd backend && ./.venv/bin/python -m unittest discover -s tests -q
cd backend && FLASK_ENV=development DATABASE_URL=sqlite:////tmp/streakup_pg_migration_validation.db ./.venv/bin/flask --app run.py db upgrade
cd backend && FLASK_ENV=development DATABASE_URL=sqlite:////tmp/streakup_pg_migration_validation.db ./.venv/bin/flask --app run.py audit-legacy-sqlite --path ../data/app.db
cd backend && FLASK_ENV=development DATABASE_URL=sqlite:////tmp/streakup_pg_migration_validation.db ./.venv/bin/flask --app run.py migrate-sqlite-to-postgres --path ../data/app.db
```

Observed results:

- backend test suite passed
- fresh Alembic upgrade succeeded
- legacy SQLite audit succeeded and surfaced the expected optional-table and XP-drift findings
- SQLite-to-target migration succeeded on a disposable target DB
- imported user XP state was reconciled from `xp_logs`

Relevant test coverage added or updated:

- `backend/tests/test_migration_readiness.py`
- `backend/tests/test_runtime_security.py`
- `backend/tests/test_xp_consistency.py`
- `backend/tests/test_operational_readiness.py`
- `backend/tests/test_auth_flow.py`

## 9. Residual Risks

Still not verified in this environment:

1. real PostgreSQL execution rather than SQLite-backed validation
2. real Render startup lifecycle
3. production Gunicorn boot on hosted infra
4. real remote CORS behavior with the deployed frontend/mobile client
5. end-to-end connected flows against hosted services

These are not code blockers now, but they are still production-release gates.

## 10. Recommended Execution Order

1. Provision PostgreSQL on Render.
2. Set backend env vars:
   - `SECRET_KEY`
   - `JWT_SECRET_KEY`
   - `DATABASE_URL`
   - `PORT`
   - `CORS_ALLOWED_ORIGINS`
   - `OPENAI_API_KEY` only if hosted photo validation is required
3. Run:

```bash
cd backend && ./.venv/bin/flask --app run.py db upgrade
```

4. Seed the catalog:

```bash
cd backend && ./.venv/bin/flask --app run.py seed-catalog
```

5. If preserving current SQLite data, audit first and then import:

```bash
cd backend && ./.venv/bin/flask --app run.py audit-legacy-sqlite --path ../data/app.db
cd backend && ./.venv/bin/flask --app run.py migrate-sqlite-to-postgres --path ../data/app.db
```

6. Start the backend on the hosted process manager.
7. Smoke test `healthz`, `readyz`, auth, catalog, assignment, check-ins, stats, Pomodoro, and validation fallback behavior.
8. Point the frontend/APK to the hosted backend.

## 11. Local Validation Checklist

- [ ] `cd backend && ./.venv/bin/python -m unittest discover -s tests -q`
- [ ] `cd backend && ./.venv/bin/flask --app run.py db upgrade`
- [ ] `cd backend && ./.venv/bin/flask --app run.py seed-catalog`
- [ ] `cd backend && ./.venv/bin/flask --app run.py audit-legacy-sqlite --path ../data/app.db`
- [ ] verify `/healthz` returns `200`
- [ ] verify `/readyz` returns `200`
- [ ] verify registration works
- [ ] verify login returns tokens
- [ ] verify habit catalog fetch works
- [ ] verify habit assignment works and duplicate assignment returns `409`
- [ ] verify check-in toggle awards and revokes XP consistently
- [ ] verify detailed stats include XP and level fields
- [ ] verify Pomodoro rejects invalid integers and foreign `habit_id`
- [ ] verify photo validation fails safely when `OPENAI_API_KEY` is unset

## 12. Final Go / No-Go

### Codebase state

**Go for staging PostgreSQL migration.**

### Production release state

**No-go until staging PostgreSQL and Render smoke tests pass.**

That is the correct boundary after this implementation:

- the code blockers are fixed
- the legacy SQLite migration path exists
- the hosted environment still needs real validation
