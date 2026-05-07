# StreakUP PostgreSQL + Render Migration Readiness Report

Date: 2026-04-11

## 1. Executive Summary

This report covers the backend/database readiness audit requested for the StreakUP migration path:

1. clean backend/database logic
2. migrate SQLite schema/data to PostgreSQL
3. deploy PostgreSQL on Render
4. deploy backend on Render
5. point frontend/APK to the hosted backend

The original codebase was **not safe to migrate** because the database contract was split across three inconsistent sources:

- `data/db/schema.sql`
- SQLAlchemy ORM models
- Alembic migrations

It also contained:

- SQLite-only migration history
- non-atomic DB write flows
- Postgres-fragile date comparisons
- raw base64 image storage in the database
- missing PostgreSQL driver dependency
- deploy docs still centered on hosted SQLite

Those blockers have now been addressed in code.

## 2. Current Verdict

### Before fixes

**Not safe to migrate.**

Main blockers:

- Alembic history was SQLite-specific and not a valid PostgreSQL migration path.
- ORM/schema drift meant `db.create_all()`, `schema.sql`, and `flask db upgrade` did not produce the same contract.
- Check-in / XP / validation writes could partially commit and leave inconsistent state.
- Validation and stats relied on string-based `func.date(...)` comparisons that are unsafe on PostgreSQL.
- Validation stored full base64 evidence in the database.

### After fixes

**Safe to proceed to a staging PostgreSQL migration and Render smoke test.**

This is a **staging go**, not a final production go/no-go, because this environment did **not** execute:

- a real PostgreSQL database migration
- a live Render deployment
- end-to-end frontend/mobile calls against hosted infrastructure

Production go/no-go should be decided only after the staging checklist in Section 10 passes on a real PostgreSQL instance and the hosted backend.

## 3. Architecture Summary

### Backend

- Flask app factory in `backend/app/__init__.py:17-63`
- SQLAlchemy + Flask-Migrate + JWT extensions in `backend/app/extensions.py`
- Environment-driven config in `backend/app/config.py:66-133`
- Route modules:
  - auth
  - habits/catalog assignment
  - check-ins
  - stats
  - pomodoro
  - validation
  - ops readiness/liveness

### Database

- Local SQLite bootstrap schema in `data/db/schema.sql:1-192`
- Catalog seed in `data/db/seed.sql:1-34`
- Hosted/runtime catalog bootstrap in `backend/app/services/catalog_bootstrap_service.py`
- Alembic migration history in:
  - `backend/migrations/versions/0001_initial_baseline.py`
  - `backend/migrations/versions/0002_add_pomodoro_sessions.py`

### Data model

Primary tables:

- `users`
- `xp_logs`
- `categorias`
- `habitos`
- `habitos_usuario`
- `registro_habitos`
- `validaciones`
- `pomodoro_sessions`
- `niveles` (currently unused by backend flows)

### Frontend/backend contract

Connected frontend already targets backend APIs and requires `NEXT_PUBLIC_API_URL` outside development-like web runtimes:

- `frontend/services/config/runtime.ts:37-74`

Mobile connected builds already enforce `https://`:

- `frontend/package.json:5-10`

## 4. Audit Findings by Severity

## Critical

### C1. SQLite-only Alembic history

**Original issue**

The migration files were built with SQLite raw SQL and SQLite syntax:

- `AUTOINCREMENT`
- SQLite-flavored booleans
- raw SQL strings instead of portable Alembic operations

Evidence from the original migration shape was replaced by portable DDL. The fixed files are now:

- `backend/migrations/versions/0001_initial_baseline.py:18-169`
- `backend/migrations/versions/0002_add_pomodoro_sessions.py:18-52`

**Why this mattered**

`flask db upgrade` was not a trustworthy PostgreSQL path.

**Status**

Fixed.

### C2. Schema drift across ORM, schema.sql, and migrations

**Original issue**

Examples of drift found during the audit:

- `users.username` unique in ORM but not in `schema.sql`
- `categorias.nombre` unique in `schema.sql` but not ORM
- `xp_logs.usuario_id` lost `ON DELETE CASCADE` in ORM
- Pomodoro check constraints existed in SQL but not ORM

Relevant aligned files now:

- `data/db/schema.sql:12-175`
- `backend/app/models/user.py`
- `backend/app/models/habit.py`
- `backend/app/models/user_habit.py`
- `backend/app/models/checkin.py`
- `backend/app/models/validation_log.py`
- `backend/app/models/pomodoro_session.py`
- `backend/app/models/xp_log.py`
- `backend/migrations/versions/0001_initial_baseline.py:18-169`
- `backend/migrations/versions/0002_add_pomodoro_sessions.py:18-52`

**Why this mattered**

Different initialization paths created different schemas, so local tests could pass while hosted migrations failed or produced different constraints.

**Status**

Fixed.

## High

### H1. Non-atomic check-in / XP writes

**Original issue**

Check-in rows and XP writes committed in separate steps. If the second step failed, the DB could keep the check-in without the corresponding XP adjustment.

Fixed implementation:

- `backend/app/services/checkin_service.py:35-59`
- `backend/app/services/xp_service.py:13-51`

**Why this mattered**

This would create inconsistent totals and history, especially under production DB/network failures.

**Status**

Fixed.

### H2. Non-atomic validation flow

**Original issue**

Validation could write a check-in, then write XP, then write validation log in separate commits.

Fixed implementation:

- `backend/app/services/validation_service.py:57-96`

**Why this mattered**

A partial failure could leave:

- check-in without validation log
- XP without validation log
- validation log without consistent check-in/XP state

**Status**

Fixed.

### H3. Raw base64 photo evidence stored in DB

**Original issue**

Validation logs stored `image_base64` directly in `validaciones.evidencia`.

Current implementation stores metadata only:

- `backend/app/services/validation_service.py:86-91`

Regression coverage:

- `backend/tests/test_xp_consistency.py:76-92`

**Why this mattered**

This is a poor fit for hosted PostgreSQL:

- large row size growth
- unnecessary DB storage cost
- avoidable data risk

**Status**

Fixed according to the chosen policy: do not store base64 in DB.

### H4. Postgres-fragile date filters

**Original issue**

The code compared `func.date(timestamp_column)` against `today.isoformat()` strings.

That is permissive in SQLite and fragile in PostgreSQL because the right-hand side is typed as string/varchar, not date.

Fixed implementations:

- `backend/app/services/validation_service.py:38-47`
- `backend/app/services/stats_service.py:59-71`
- `backend/app/services/xp_service.py:81-100`

**Why this mattered**

Read paths that appear correct in SQLite could fail or behave differently in PostgreSQL.

**Status**

Fixed.

## Medium

### M1. Portable seed path still used SQLite-only semantics

**Original issue**

`data/db/seed.sql` used `INSERT OR IGNORE`, which is SQLite-specific.

Current version:

- `data/db/seed.sql:8-34`

**Why this mattered**

The local bootstrap path was not portable or representative of hosted behavior.

**Status**

Fixed with `ON CONFLICT ... DO UPDATE`.

### M2. Missing PostgreSQL driver dependency

**Original issue**

`backend/requirements.txt` lacked a Postgres driver.

Current version:

- `backend/requirements.txt:1-9`

**Why this mattered**

Render/PostgreSQL deployment would fail at connection time even if code was otherwise correct.

**Status**

Fixed with `psycopg[binary]`.

### M3. Pomodoro accepted fragile payloads

**Original issue**

Pomodoro did not strictly validate integer fields or ensure `habit_id` belonged to the authenticated user.

Current version:

- `backend/app/services/pomodoro_service.py:18-58`

Coverage:

- `backend/tests/test_operational_readiness.py:230-272`

**Why this mattered**

Hosted DB constraints would reject some invalid writes later than necessary, and foreign habit references could cross user boundaries.

**Status**

Fixed.

### M4. Stats detailed summary omitted XP/level fields declared in frontend types

**Original issue**

`frontend/types/stats.ts` expects `summary.total_xp` and `summary.level`, but backend detailed stats did not provide them.

Current version:

- `backend/app/services/stats_service.py:201-209`

**Why this mattered**

This was a contract drift risk.

**Status**

Fixed.

## Low

### L1. CORS too permissive for production

**Original issue**

The backend allowed `origins="*"` unconditionally.

Current version:

- `backend/app/config.py:54-80`
- `backend/app/__init__.py:23-33`

**Why this mattered**

This is acceptable locally but too broad for hosted production.

**Status**

Improved. CORS is now env-driven via `CORS_ORIGINS`.

### L2. Deployment docs still described hosted SQLite

**Original issue**

README deployment instructions were still written around hosted SQLite.

Current version:

- `README.md:212-279`

**Status**

Fixed.

### L3. `niveles` remains unused

**Issue**

`niveles` still exists in schema and migrations but is not part of current runtime flows.

Evidence:

- `data/db/schema.sql:178-192`
- `backend/migrations/versions/0001_initial_baseline.py:146-155`

**Impact**

Not a migration blocker, but it remains dead schema until the leveling system is externalized into it or the table is removed in a future cleanup migration.

**Status**

Not changed by this work.

## 5. Migration Blockers and Status

| Blocker | Status | Resolution |
| --- | --- | --- |
| SQLite-only Alembic migrations | Fixed | Replaced raw SQL with portable `op.create_table` migrations |
| Schema drift across schema.sql / ORM / Alembic | Fixed | Aligned constraints, defaults, uniqueness, and indexes |
| Non-atomic write flows | Fixed | Single-transaction behavior for check-in / XP / validation |
| PostgreSQL-unsafe date filtering | Fixed | Typed date expressions via SQLAlchemy |
| Raw base64 validation storage | Fixed | Validation logs no longer store the image payload |
| Missing Postgres driver | Fixed | Added `psycopg[binary]` |
| Production CORS hardening | Improved | Env-driven origins |
| Real hosted PostgreSQL smoke test | Open | Must still be run outside this environment |
| Real Render deployment smoke test | Open | Must still be run outside this environment |

## 6. Changes Applied

### 6.1 Config and deployment safety

Files:

- `backend/app/config.py:47-80`
- `backend/app/__init__.py:23-33`
- `backend/requirements.txt:1-9`
- `README.md:212-279`

Changes:

- normalize `postgres://` to `postgresql://`
- add `pool_pre_ping`
- make CORS origins configurable
- add PostgreSQL driver
- rewrite deployment docs for Render + PostgreSQL

### 6.2 Schema contract alignment

Files:

- `data/db/schema.sql:12-175`
- `data/db/seed.sql:8-34`
- `backend/migrations/versions/0001_initial_baseline.py:18-169`
- `backend/migrations/versions/0002_add_pomodoro_sessions.py:18-52`
- ORM model files under `backend/app/models/`

Changes:

- align unique constraints
- align default values
- align check constraints
- align FK delete behavior
- align indexes
- make local seed SQL portable and idempotent

### 6.3 Atomic write flows

Files:

- `backend/app/services/xp_service.py:13-51`
- `backend/app/services/checkin_service.py:35-59`
- `backend/app/services/validation_service.py:57-96`

Changes:

- no commit inside helper write paths
- rollback on error
- single commit per request flow

### 6.4 PostgreSQL-safe query behavior

Files:

- `backend/app/services/xp_service.py:81-100`
- `backend/app/services/validation_service.py:38-47`
- `backend/app/services/stats_service.py:59-71`

Changes:

- use typed date expressions instead of string/date coercion through SQLite behavior

### 6.5 API validation hardening

Files:

- `backend/app/services/pomodoro_service.py:18-58`
- `backend/app/routes/checkin_routes.py`
- `backend/app/routes/habit_routes.py`

Changes:

- validate integer payloads earlier
- validate habit ownership for Pomodoro
- fail with explicit API errors before DB constraint failures

## 7. Diff Summary and Why Each Change Was Necessary

### Key diff 1: Portable migrations

Before:

- raw SQLite DDL in Alembic

After:

- Alembic operations with portable SQLAlchemy types and constraints

Why:

- `flask db upgrade` must be the source of truth for PostgreSQL/Render

### Key diff 2: Single-transaction XP/check-in/validation behavior

Before:

- multiple commits inside one user action

After:

- helper functions can avoid committing
- outer flow commits once
- rollback on exception

Why:

- production DB failures must not leave partial state behind

### Key diff 3: Stop storing raw base64 evidence

Before:

- `ValidationLog.evidencia = image_base64`

After:

- `ValidationLog.evidencia = None`

Why:

- large media payloads do not belong in transactional Postgres rows for this MVP

### Key diff 4: Typed date filters

Before:

- date comparison against ISO strings

After:

- typed SQLAlchemy `Date` expressions

Why:

- SQLite coercion is not a safe proxy for PostgreSQL behavior

### Key diff 5: Postgres deploy config

Before:

- no Postgres driver
- docs still guided toward hosted SQLite

After:

- `psycopg[binary]`
- Render/Postgres setup documented

Why:

- without this, deployment would fail even after fixing the schema layer

## 8. Test and Validation Performed

Command run:

```bash
cd backend && ./.venv/bin/python -m unittest discover -s tests -v
```

Result:

- `29` tests passed

What is now covered:

- auth flow
- operational readiness endpoints
- validation disabled/provider-unavailable behavior
- pomodoro happy path
- pomodoro invalid payload rejection
- migration smoke test via `flask db upgrade`
- portable seed idempotence
- atomic rollback behavior for check-in and validation when XP writing fails

Relevant test files:

- `backend/tests/test_auth_flow.py`
- `backend/tests/test_runtime_security.py`
- `backend/tests/test_operational_readiness.py:71-272`
- `backend/tests/test_xp_consistency.py:76-143`
- `backend/tests/test_migration_readiness.py:41-96`

## 9. Residual Risks / What Was Not Verified Here

The following items remain outside the scope of this environment and still require staging validation:

1. A real migration run against PostgreSQL
2. Real Render service startup using hosted `DATABASE_URL`
3. Real Gunicorn startup in hosted runtime
4. Real network path from frontend or APK to hosted backend
5. End-to-end auth, habit, check-in, stats, and readiness smoke tests against hosted infrastructure

These are no longer code blockers, but they are still release blockers for production.

## 10. Recommended Execution Order From Here

1. Install backend dependencies in the deployment environment:

   ```bash
   cd backend && ./.venv/bin/pip install -r requirements.txt
   ```

2. Provision PostgreSQL on Render.

3. Configure backend environment variables:

   - `SECRET_KEY`
   - `JWT_SECRET_KEY`
   - `DATABASE_URL`
   - `PORT`
   - `CORS_ORIGINS`
   - `OPENAI_API_KEY` only if photo validation is required

4. Run migrations:

   ```bash
   cd backend && ./.venv/bin/flask --app run.py db upgrade
   ```

5. Seed the catalog:

   ```bash
   cd backend && ./.venv/bin/flask --app run.py seed-catalog
   ```

6. Start the backend:

   ```bash
   cd backend && PORT=8000 ./.venv/bin/gunicorn --bind 0.0.0.0:$PORT run:app
   ```

7. Smoke test:

   - `GET /healthz`
   - `GET /readyz`
   - register
   - login
   - fetch catalog
   - assign habit
   - toggle check-in
   - fetch stats summary
   - fetch detailed stats
   - create/complete Pomodoro session
   - validate habit with photo validation disabled and confirm the safe `503` behavior

8. Point web frontend to hosted backend:

   - `NEXT_PUBLIC_API_URL=https://...`
   - `NEXT_PUBLIC_OFFLINE_MODE=false`

9. Build and validate mobile-connected output.

## 11. Local Validation Checklist Before PostgreSQL Migration

- [ ] `cd backend && ./.venv/bin/python -m unittest discover -s tests -v`
- [ ] `cd backend && ./.venv/bin/flask --app run.py db upgrade`
- [ ] `cd backend && ./.venv/bin/flask --app run.py seed-catalog`
- [ ] verify `/healthz` returns `200`
- [ ] verify `/readyz` returns `200` after seed
- [ ] verify registration works
- [ ] verify login returns tokens
- [ ] verify `/api/habits/catalog` returns 12 catalog entries
- [ ] verify habit assignment works and duplicate assignment returns `409`
- [ ] verify check-in toggle awards and revokes XP consistently
- [ ] verify detailed stats include `summary.total_xp` and `summary.level`
- [ ] verify Pomodoro rejects invalid integers and foreign `habit_id`
- [ ] verify photo validation does not persist the raw image payload

## 12. Final Go / No-Go

### Codebase state

**Go for staging PostgreSQL migration.**

### Production release state

**No-go until staging PostgreSQL + Render smoke tests pass.**

That is the correct decision boundary after this implementation:

- the code blockers are fixed
- the hosted environment is not yet empirically validated

