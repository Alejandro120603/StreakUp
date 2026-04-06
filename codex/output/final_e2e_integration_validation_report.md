# Final E2E Integration Validation Report: StreakUP

## Audit Metadata

- Audit date: 2026-04-05
- Audit timezone: America/Mexico_City
- Validation scope: local hosted-style integration only
- Fresh audit DB: `/tmp/streakup-e2e-validation-20260405202802.db`
- Main backend instance: `127.0.0.1:8010`
- Validation-disabled backend instance: `127.0.0.1:8011`
- Frontend server: `127.0.0.1:3100`
- Important timestamp note:
  - check-in dates were stored and validated against local date `2026-04-05`
  - user and pomodoro timestamps were stored as UTC timestamps on `2026-04-06`
  - this is expected from the current model/service behavior and should not be confused as a duplicate-day bug

## Executive Verdict

- Verdict: `NOT YET RELIABLY INTEGRATED`

Short explanation:

- The system does work end-to-end for the main connected path when the backend is available:
  - fresh DB migrate + seed
  - backend Gunicorn startup
  - register/login
  - catalog fetch
  - habit assignment
  - check-in persistence
  - stats/profile consistency
  - pomodoro create/list/complete
  - health/readiness
- The reason this is still a `NO-GO` for reliable connected usage is failure honesty:
  - in connected mode, multiple frontend services silently fall back to cached or synthetic local data when the backend becomes unreachable
  - that means frontend state can diverge from API truth and DB truth without clearly telling the user

## Validation Method

This audit did not assume success from tests alone.

What was actually validated:

- backend tests: `22` passed
- frontend typecheck: passed
- frontend unit tests: passed
- production web build with explicit API URL: passed
- mobile export build with explicit `https://` API URL: passed
- mobile export build with `http://` API URL: failed honestly as intended
- real runtime API calls against Gunicorn on a fresh DB
- real frontend service-layer execution against the running backend
- direct SQL checks against the same fresh DB after each major action
- direct HTTP checks against the running frontend server

What was not fully validated:

- no real browser automation was available in this environment
- no physical mobile/device runtime smoke test was performed
- provider-enabled OpenAI validation was configured but not operationally successful in this environment

## Environment Trace

### Frontend -> Backend path

Source of truth:

- [frontend/services/config/runtime.ts](/home/alexo/projects/streakUP/frontend/services/config/runtime.ts)
- [frontend/services/api/client.ts](/home/alexo/projects/streakUP/frontend/services/api/client.ts)
- [frontend/services/api/endpoints.ts](/home/alexo/projects/streakUP/frontend/services/api/endpoints.ts)

Observed runtime behavior:

- the frontend uses `NEXT_PUBLIC_API_URL` as the connected API base URL
- for the audited production web build, `getApiBaseUrl()` resolved to:
  - `http://127.0.0.1:8010`
- production web build succeeded with:
  - `NEXT_PUBLIC_API_URL=http://127.0.0.1:8010`
  - `NEXT_PUBLIC_OFFLINE_MODE=false`
- exported mobile build succeeded with:
  - `NEXT_PUBLIC_API_URL=https://api.example.com`
  - `NEXT_PUBLIC_OFFLINE_MODE=false`
- exported mobile build failed honestly with non-HTTPS API URL:
  - `NEXT_PUBLIC_API_URL must use an https:// hosted backend for mobile builds.`

Local env findings:

- `frontend/.env.local` contains:
  - `NEXT_PUBLIC_API_URL=http://172.24.62.16:5000`
- `frontend/.env.local` does not contain:
  - `NEXT_DEV_API_PROXY_URL`

Hosted-style path assessment:

- connected builds can point to an explicit backend by config
- relative `/api` fallback is not required for production builds
- no active runtime evidence showed a production rewrite/proxy masking backend routing
- stale `localhost:5000` strings still exist inside `.next/cache` artifacts, but not in the audited runtime asset path

### Backend -> DB path

Source of truth:

- [backend/app/config.py](/home/alexo/projects/streakUP/backend/app/config.py)
- [backend/run.py](/home/alexo/projects/streakUP/backend/run.py)
- [backend/migrations/versions/0001_initial_baseline.py](/home/alexo/projects/streakUP/backend/migrations/versions/0001_initial_baseline.py)
- [backend/migrations/versions/0002_add_pomodoro_sessions.py](/home/alexo/projects/streakUP/backend/migrations/versions/0002_add_pomodoro_sessions.py)
- [backend/app/cli.py](/home/alexo/projects/streakUP/backend/app/cli.py)

Observed runtime behavior:

- the audited backend used explicit process env:
  - `DATABASE_URL=sqlite:////tmp/streakup-e2e-validation-20260405202802.db`
  - strong `SECRET_KEY`
  - strong `JWT_SECRET_KEY`
- `backend/.env.local` does not set `DATABASE_URL`
- Alembic upgraded fresh DB to:
  - `0002_add_pomodoro_sessions`
- `seed-catalog` populated:
  - `3` categories
  - `12` habits

### Backend startup path

Source of truth:

- [backend/run.py](/home/alexo/projects/streakUP/backend/run.py)
- [Makefile](/home/alexo/projects/streakUP/Makefile)

Observed runtime behavior:

- backend was run through Gunicorn:
  - `./.venv/bin/gunicorn --bind 127.0.0.1:8010 run:app`
- `/healthz` returned:
  - `{"status":"ok"}`
- `/readyz` on `8010` returned:
  - DB ready: true
  - catalog ready: true
  - validation configured: true
- `/readyz` on `8011` with `OPENAI_API_KEY=''` returned:
  - DB ready: true
  - catalog ready: true
  - validation configured: false

### OpenAI validation runtime assumptions

Source of truth:

- [backend/app/config.py](/home/alexo/projects/streakUP/backend/app/config.py)
- [backend/app/services/openai_service.py](/home/alexo/projects/streakUP/backend/app/services/openai_service.py)
- [backend/app/routes/validation_routes.py](/home/alexo/projects/streakUP/backend/app/routes/validation_routes.py)

Observed env behavior:

- `backend/.env.local` contains a non-empty `OPENAI_API_KEY`
- that inherited env caused the main backend on `8010` to report `validation.configured=true`
- the second backend on `8011` was launched with `OPENAI_API_KEY=''` and correctly reported `validation.configured=false`

## Fresh Deploy Validation

Expected sequence:

1. migrate DB
2. seed catalog
3. start backend
4. register/login
5. assign habit
6. check-in
7. read stats
8. use pomodoro
9. hit health/readiness

Actual result:

- all nine steps were reproduced on a fresh DB
- no repo-tracked DB was used
- `pomodoro_sessions` existed after migration
- readiness correctly required DB + catalog

Result: `PASS`

## Flow Validation Results

### 1. Auth End-to-End

Expected:

- register a new user
- confirm DB insert
- login and receive valid auth payload
- frontend stores session
- protected API calls use bearer token
- invalid session is handled honestly

Actual:

- user registered successfully through the real auth path
- DB `users` row was created:
  - `id=1`
  - `email=e2e_1775442718685@example.com`
- login returned:
  - `access_token`
  - `refresh_token`
  - `user`
- frontend stored:
  - `access_token`
  - `refresh_token`
  - `user`
- authenticated API calls succeeded with bearer auth
- expired signed JWT returned real `401`
- frontend client removed stored session and set redirect target to `/login`

Result: `PARTIAL`

Why not full pass:

- API/session mechanics are correct
- frontend route protection is still client-side only
- unauthenticated `GET /` and `GET /habits` returned `200` HTML shells from Next.js and relied on hydration-time redirect

Root cause:

- [frontend/middleware.ts](/home/alexo/projects/streakUP/frontend/middleware.ts) is a no-op
- [frontend/app/(dashboard)/layout.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/layout.tsx) performs auth gating only on the client

### 2. Habit Catalog + Assignment

Expected:

- frontend fetches real catalog rows
- assignment creates a real DB association
- duplicate assignment is rejected honestly

Actual:

- catalog returned `12` rows and matched DB `habitos`
- assigning catalog habit `1` created:
  - `habitos_usuario.id=1`
  - `usuario_id=1`
  - `habito_id=1`
- duplicate assignment returned:
  - `"This habit is already active for the user."`

Result: `PASS`

### 3. Check-in Flow

Expected:

- mark habit completed
- persist one same-day row
- update today state
- support toggle off/on without duplicates
- keep XP coherent

Actual:

- first toggle created one DB row in `registro_habitos`
- first toggle added one XP log with `cantidad=10`
- uncheck removed check-in and added XP log `cantidad=-10`
- re-check recreated one same-day DB row and added `cantidad=10`
- final DB state:
  - exactly one same-day check-in row
  - user total XP back at `10`

Result: `PASS`

### 4. Stats / Profile Consistency

Expected:

- stats derive from real DB state
- frontend values match API values
- API values match DB truth

Actual connected values:

- `today_completed=1`
- `today_total=1`
- `completion_rate=14`
- `total_xp=10`
- `level=1`
- `current_streak=1`
- `longest_streak=1`
- `best_day=1`
- `active_days=1`
- `validations_today=0`

These matched:

- DB truth
- `/api/stats/summary`
- `/api/stats/xp`
- `/api/stats/detailed`
- frontend service-layer results

Result: `PASS`

### 5. Pomodoro Flow

Expected:

- create session
- persist session
- list session
- complete session
- work against fresh migrated DB

Actual:

- create returned a real DB-backed session
- list returned the same session
- complete marked `completed=true` and set `completed_at`
- final DB count:
  - `1` pomodoro session

Result: `PASS`

### 6. Photo Validation Flow

#### Case A - without `OPENAI_API_KEY`

Expected:

- route fails safely and honestly
- frontend surfaces honest failure
- no side effects are written

Actual:

- backend `8011` reported `validation.configured=false`
- frontend validation call returned:
  - `"La validacion de fotos no esta disponible en este entorno."`
- DB side effects after the call:
  - `validaciones`: still `0`
  - `registro_habitos`: unchanged
  - XP/user totals: unchanged

Result: `PASS`

#### Case B - provider notionally enabled

Expected:

- if provider works, validate contract and side effects
- if provider is unavailable, fail honestly with no fake success

Actual:

- backend `8010` reported `validation.configured=true`
- real validation call returned:
  - `"La validacion de fotos no esta disponible temporalmente."`
- DB side effects after the call:
  - `validaciones`: still `0`
  - `registro_habitos`: unchanged
  - `xp_logs`: unchanged
  - `users.total_xp`: unchanged

Result: `PARTIAL`

Root cause:

- key presence was enough to mark the feature configured
- provider execution was not operationally successful in this environment

Honesty verdict for this case:

- good: it did not fake success and did not leak a raw exception
- limitation: provider-enabled success path was not proven

### 7. Frontend Build + Integration Path

Expected:

- production web build accepts explicit backend URL
- mobile export requires explicit hosted URL
- no connected production path depends on localhost rewrite tricks

Actual:

- web build passed with explicit API URL:
  - `NEXT_PUBLIC_API_URL=http://127.0.0.1:8010`
- mobile export passed with explicit hosted HTTPS URL:
  - `NEXT_PUBLIC_API_URL=https://api.example.com`
- mobile export failed honestly with HTTP URL
- runtime assets showed explicit embedded API base values for audited builds
- no active production runtime evidence depended on a rewrite/proxy

Result: `PASS`

Important caveat:

- `frontend/.env.local` still defaults local connected runs to `http://172.24.62.16:5000`
- that is not a hosted URL and should not be mistaken for production config

## DB Truth vs API vs Frontend

### Connected path: final aligned state

| Item | DB truth | API truth | Frontend truth | Result |
| --- | --- | --- | --- | --- |
| Users | `1` user | login user `id=1` | stored user `id=1` | aligned |
| Catalog | `12` habits | `/api/habits/catalog` returned `12` | frontend catalog returned `12` | aligned |
| Assigned habits | `1` active assignment | `/api/habits` returned `1` | `fetchHabits()` returned `1` | aligned |
| Today status | `1` same-day check-in | `/api/checkins/today` showed `checked_today=true` | `fetchTodayHabits()` showed `checked_today=true` | aligned |
| XP | `10` | `/api/stats/summary.total_xp=10`, `/api/stats/xp.total_xp=10` | connected stats showed `10` | aligned |
| Streak | `1` consecutive day | summary/detailed returned `1` | connected stats showed `1` | aligned |
| Pomodoro | `1` completed row | `/api/pomodoro/sessions` returned `1` completed session | frontend pomodoro service returned same | aligned |
| Validation rows | `0` | no success payload written | frontend got honest error | aligned |

### Failure path: mismatches found

| Scenario | DB truth | Frontend returned | Result |
| --- | --- | --- | --- |
| backend unreachable, `fetchHabits()` | still `1` real habit | cached habit returned | masked failure |
| backend unreachable, `fetchTodayHabits()` | still real same-day check-in | cached today state returned | masked failure |
| backend unreachable, `fetchStatsSummary()` | `total_xp=10` | fallback returned `total_xp=0` | inconsistent |
| backend unreachable, `fetchPomodoroSessions()` | `1` real pomodoro | cached pomodoro returned | masked failure |
| backend unreachable, `createHabit()` | no new DB row | synthetic offline habit with negative ID | fake success |
| backend unreachable, `createPomodoroSession()` | no new DB row | synthetic offline pomodoro with negative ID | fake success |
| backend unreachable, `toggleCheckin()` | DB unchanged | local result for date `2026-04-06` | fake local mutation |

## Failure-Honesty Findings

These are the most important remaining integration issues.

### 1. Connected mode still falls back to local cached reads

Affected frontend files:

- [frontend/services/habits/habitService.ts](/home/alexo/projects/streakUP/frontend/services/habits/habitService.ts)
- [frontend/services/checkins/checkinService.ts](/home/alexo/projects/streakUP/frontend/services/checkins/checkinService.ts)
- [frontend/services/stats/statsService.ts](/home/alexo/projects/streakUP/frontend/services/stats/statsService.ts)
- [frontend/services/pomodoro/pomodoroService.ts](/home/alexo/projects/streakUP/frontend/services/pomodoro/pomodoroService.ts)

Observed runtime behavior with `NEXT_PUBLIC_OFFLINE_MODE=false` and unreachable backend:

- `fetchHabits()` returned cached habit data
- `fetchTodayHabits()` returned cached today state
- `fetchStatsSummary()` returned local fallback stats
- `fetchPomodoroSessions()` returned cached sessions

Why this matters:

- the UI can look connected and healthy even when it is no longer reading the backend

### 2. Connected mode still fabricates local write success

Affected frontend files:

- [frontend/services/habits/habitService.ts](/home/alexo/projects/streakUP/frontend/services/habits/habitService.ts)
- [frontend/services/checkins/checkinService.ts](/home/alexo/projects/streakUP/frontend/services/checkins/checkinService.ts)
- [frontend/services/pomodoro/pomodoroService.ts](/home/alexo/projects/streakUP/frontend/services/pomodoro/pomodoroService.ts)

Observed runtime behavior with unreachable backend:

- `createHabit({ habito_id: 3 })` returned a synthetic local habit:
  - `id=-1`
  - `name="Habito Offline"`
- `createPomodoroSession(...)` returned a synthetic local session:
  - `id=-1`
- `toggleCheckin({ habit_id: 1 })` returned a local toggle result on `2026-04-06`

DB truth after these actions:

- `habitos_usuario` count remained `1`
- `pomodoro_sessions` count remained `1`
- `registro_habitos` count remained `1`
- user XP remained `10`

Why this matters:

- the frontend can report success for writes that never reached the backend or DB

### 3. Stats fallback hides DB truth

Affected frontend file:

- [frontend/services/storage/localData.ts](/home/alexo/projects/streakUP/frontend/services/storage/localData.ts)

Observed runtime behavior:

- offline fallback summary returned:
  - `total_xp=0`
  - `level=1`
  - `completion_rate=14`
- real DB truth remained:
  - `total_xp=10`
  - `level=1`

Why this matters:

- the user can be shown a stats payload that looks valid but is no longer tied to backend truth

### 4. Route protection is hydration-only

Affected frontend files:

- [frontend/middleware.ts](/home/alexo/projects/streakUP/frontend/middleware.ts)
- [frontend/app/(dashboard)/layout.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/layout.tsx)

Observed runtime behavior:

- unauthenticated `GET /` returned `200` HTML
- unauthenticated `GET /habits` returned `200` HTML
- both pages rendered a loading shell and rely on client redirect after hydration

Why this matters:

- protected pages are not actually protected at request time

### 5. Validation failures are not equally user-friendly

Observed runtime behavior:

- no-provider validation error was honest and product-friendly
- provider-enabled-but-temporarily-unavailable error was also controlled and safe
- unreachable-backend validation produced raw:
  - `"fetch failed"`

Why this matters:

- validation failure UX is not consistent across failure types

## Remaining Integration Gaps

### Gap 1

- Severity: `HIGH`
- Affected layers: frontend, backend, DB
- Root cause:
  - connected-mode frontend services treat network `TypeError` as a reason to fall back to local data and local writes
- Recommended correction:
  - when `NEXT_PUBLIC_OFFLINE_MODE=false`, fail honestly for write operations and clearly mark read data as cached/offline if you keep the fallback at all

### Gap 2

- Severity: `MEDIUM`
- Affected layers: frontend auth
- Root cause:
  - route guarding is only client-side
- Recommended correction:
  - implement real middleware/server-side protection for dashboard routes

### Gap 3

- Severity: `MEDIUM`
- Affected layers: backend validation, frontend validation UX
- Root cause:
  - `validation.configured=true` means key-present, not provider-operational
- Recommended correction:
  - keep the current safe failure, but distinguish config presence from provider readiness in ops visibility and final UX expectations

### Gap 4

- Severity: `MEDIUM`
- Affected layers: frontend mobile/runtime validation scope
- Root cause:
  - mobile build/export path was validated, but no device runtime was exercised
- Recommended correction:
  - run one real device/WebView smoke test against a hosted backend before calling mobile connected flow production-ready

### Gap 5

- Severity: `LOW`
- Affected layers: local developer config
- Root cause:
  - `frontend/.env.local` still points to a LAN IP by default
- Recommended correction:
  - document clearly that hosted-style connected validation must override local env and not rely on LAN defaults

## Final Go / No-Go

- Can the system now be used in a real connected flow?
  - `Yes, but only while the backend stays reachable and photo validation is treated as optional.`

- Can frontend, backend, and DB be trusted to stay in sync?
  - `No.`

- Exact caveats:
  - connected-mode frontend services still mask backend failure with cached or synthetic local state
  - auth-protected pages are not request-time protected
  - OpenAI-enabled validation success path was not proven
  - mobile runtime on a real device was not validated

Final release recommendation:

- `NO-GO for claiming reliable connected integration`
- `GO only for a limited MVP/internal test claim if the team explicitly accepts the failure-honesty gaps and treats offline fallback as non-authoritative`

## Evidence Summary

Key runtime facts captured during this audit:

- backend tests passed: `22`
- frontend typecheck passed
- frontend unit tests passed
- production web build passed with explicit API URL
- mobile export build passed with HTTPS API URL
- mobile export build failed honestly with HTTP API URL
- fresh DB migrated to `0002_add_pomodoro_sessions`
- catalog seeded to `3` categories and `12` habits
- connected auth/catalog/check-in/stats/pomodoro path matched DB truth
- no-provider validation failed safely with no side effects
- provider-enabled validation did not fake success and did not write side effects
- failure-honesty audit found multiple masked or fabricated frontend success states

