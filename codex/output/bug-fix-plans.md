# Bug Fix Plans

Assumptions:
- The requested output path is `codex/output`, so this plan file is written there even though the repo already has `Codex/output`.
- These are minimal, blocking-fix plans aimed at restoring correct behavior first, not extending the feature set beyond what the current schema and API can safely support.

## Issue 1: Fresh DBs fail because `users.level` and `users.xp_in_level` do not exist

**Priority:** P1

**Problem**
- `backend/app/models/user.py` now maps `level` and `xp_in_level`.
- Fresh environments built from `data/db/schema.sql` only create `total_xp`.
- Any query that loads `User` from a fresh DB can fail with `no such column`.

**Files to Touch**
- `data/db/schema.sql`
- `backend/tests/test_auth_flow.py`

**Plan**
1. Update the `users` table definition in `data/db/schema.sql` to add `level INTEGER NOT NULL DEFAULT 1` and `xp_in_level INTEGER NOT NULL DEFAULT 0`.
2. Keep the new columns adjacent to the existing XP fields so the schema remains aligned with `backend/app/models/user.py`.
3. Add a regression test in `backend/tests/test_auth_flow.py` that exercises user creation and lookup against a schema-initialized fresh DB, proving the ORM no longer references missing columns.
4. Smoke-check any API path that reads `User`, especially login and stats summary, because those are the most likely first-failure entry points.

**Acceptance Criteria**
- A database created only from `data/db/schema.sql` can boot the app and execute user queries without column errors.
- Auth flow tests pass against the schema-created DB.

**Validation**
- `pytest backend/tests/test_auth_flow.py`
- Optional smoke check: initialize a fresh DB from `data/db/schema.sql` and hit `/api/auth/login` and `/api/stats/summary`

## Issue 2: Successful validations fail on fresh DBs because `xp_logs` is never created

**Priority:** P1

**Problem**
- `backend/app/services/validation_service.py` now calls `award_xp()`.
- `backend/app/services/xp_service.py` inserts into `XpLog`.
- `data/db/schema.sql` does not create `xp_logs`, so validations can 500 with `no such table: xp_logs`.

**Files to Touch**
- `data/db/schema.sql`
- `backend/tests/test_auth_flow.py` or a new focused backend validation/XP test

**Plan**
1. Add an `xp_logs` table to `data/db/schema.sql` that matches `backend/app/models/xp_log.py`, including the current column names `usuario_id`, `cantidad`, `fuente`, and `fecha`.
2. Add the required foreign key back to `users(id)` and at least one supporting index on `usuario_id` because XP history queries filter by user and date.
3. Add a regression test that awards XP on a schema-created DB and verifies an `xp_logs` row is persisted instead of raising a table error.
4. Prefer testing through the service path that triggers the insert, not only through raw SQL, so the schema and ORM mapping stay coupled under test.

**Acceptance Criteria**
- Fresh DBs can execute `award_xp()` successfully.
- Validation success paths no longer fail because of missing XP log persistence.
- XP history queries can read the inserted rows.

**Validation**
- `pytest backend/tests/test_auth_flow.py`
- Add and run a targeted backend test that exercises `award_xp()` or `validate_habit()`

## Issue 3: Offline login bypasses password verification

**Priority:** P1

**Problem**
- `frontend/services/auth/authService.ts` falls back to a cached session when the backend is unreachable.
- The fallback only matches `email`; it does not verify `payload.password`.
- The current stored session shape in `frontend/types/auth.ts` contains tokens and user data only, so there is no local verifier to safely authenticate offline.

**Files to Touch**
- `frontend/services/auth/authService.ts`
- `frontend/tests/unit/auth-service.test.ts`
- Optional follow-up only if product explicitly wants secure offline auth: `frontend/types/auth.ts` and the session storage format

**Recommended Fix Path**
1. Remove offline login success fallback from `login()` and return the existing offline error when the backend is unreachable.
2. Keep offline session reuse for already-authenticated app usage if that flow exists elsewhere, but do not treat it as a credential check.
3. Add a regression test in `frontend/tests/unit/auth-service.test.ts` proving that a saved session plus wrong password still fails when the network request throws.
4. Add a second test proving that matching email alone is insufficient for offline login.

**Why This Is the Safe Fix**
- The frontend does not currently persist any password-derived verifier, so there is no secure way to authenticate offline with the current design.
- Adding secure offline auth would require a larger design change and should be treated as a separate feature, not a quick bug fix.

**Acceptance Criteria**
- Offline login never succeeds solely because a matching email is cached.
- Existing saved sessions remain usable only for already-authenticated flows, not as a substitute for password verification.

**Validation**
- Extend `frontend/tests/unit/auth-service.test.ts` for the failure cases above
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

## Issue 4: Dashboard check-ins toggle twice and cancel themselves out

**Priority:** P1

**Problem**
- `frontend/services/checkins/checkinService.ts` already posts to `/api/checkins/toggle`.
- `frontend/app/(dashboard)/page.tsx` calls `toggleCheckin()` and then manually posts to the same endpoint again.
- Because the endpoint is stateful, one tap becomes two toggles and the final state reverts.

**Files to Touch**
- `frontend/app/(dashboard)/page.tsx`
- Optional regression coverage file if a dashboard/check-in test exists or is added

**Plan**
1. Remove the second manual `fetch()` call from `toggleHabit()` in `frontend/app/(dashboard)/page.tsx`.
2. Keep one source of truth for the mutation: `toggleCheckin()` from the service layer.
3. After the single toggle request completes, refresh local state once by either:
   - refetching stats and today habits, or
   - using the returned toggle result to patch local state and then refreshing summary stats.
4. Delete any now-unused local auth-header/API helpers in the page if they become dead code after removing the duplicate fetch.
5. Add a regression test if practical, or at minimum manual verification that one tap changes the persisted checked state exactly once.

**Acceptance Criteria**
- One tap produces one backend toggle.
- A checked habit stays checked after refresh.
- Stats update consistently with the new state.

**Validation**
- Manual check on the dashboard: tap once, refresh, confirm the habit remains toggled
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

## Issue 5: Habit edit screen targets an online API the backend does not support

**Priority:** P2

**Problem**
- `frontend/services/habits/habitService.ts` sends `PUT /api/habits/:id`.
- `backend/app/routes/habit_routes.py` only supports `GET`, `POST`, and `DELETE` on the compatibility `/api/habits` routes.
- There is a second scope problem: the current backend schema models catalog habits plus user assignments, but the edit screen exposes fields like `habit_type`, `frequency`, `target_duration`, and `target_quantity` that do not map to persisted backend columns today.

**Files to Touch**
- `frontend/services/habits/habitService.ts`
- `frontend/app/(dashboard)/habits/[id]/edit/page.tsx`
- `backend/app/routes/habit_routes.py`
- `backend/app/services/habit_service.py`
- Potentially the backend schema and models if full online edit support is required

**Recommended Fix Path**
1. Decide the intended product scope before coding:
   - Minimal blocking fix: disable or hide the online edit flow until backend support exists, and make the UI fail clearly instead of sending a 404.
   - Full feature fix: add a real backend update contract and persistence model for editable user-habit fields.
2. If the team wants the feature now, extend the backend first:
   - add a `PUT /api/habits/<id>` route in `backend/app/routes/habit_routes.py`
   - add a service-layer update function in `backend/app/services/habit_service.py`
   - update the schema/models if edited fields must persist beyond the current catalog-assignment structure
3. Align the frontend only after the backend contract is real, so `habitService.updateHabit()` points to an implemented route with a payload the backend can actually store.
4. Add a regression test for the online update path once the contract is finalized.

**Acceptance Criteria**
- The edit screen no longer submits to a non-existent route.
- If online edit is enabled, the backend persists the edited fields and returns the updated habit successfully.
- If online edit is not yet supported, the UI does not advertise a broken flow.

**Validation**
- Backend: add a route/service test for `PUT /api/habits/:id` if the feature remains enabled
- Frontend: submit the edit form in online mode and confirm it no longer fails with 404
- `pytest backend/tests/test_auth_flow.py`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
