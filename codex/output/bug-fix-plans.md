# Bug Fix Status

Assumptions:
- This file tracks the original five blocking review issues and the current status after follow-up fixes and verification.
- "Done" means the reported regression has been addressed for the current intended scope.
- "Next" means the highest-value remaining work after those regressions.

## Summary

**Done**
- Issue 1: fresh DB schema now includes `users.level` and `users.xp_in_level`
- Issue 2: fresh DB schema now includes `xp_logs`
- Issue 3: offline login no longer bypasses password verification
- Issue 4: dashboard check-ins no longer toggle twice
- Issue 5: the fake-success online edit flow is blocked clearly instead of pretending to save

**Still Wrong / Next To Fix**
- Real cloud-backed habit editing is still not implemented
- The app now blocks online edits correctly, but it does not persist edit-form fields to the backend

## Issue 1: Fresh DBs fail because `users.level` and `users.xp_in_level` do not exist

**Status:** Done

**What Changed**
- `data/db/schema.sql` now creates `level INTEGER NOT NULL DEFAULT 1`
- `data/db/schema.sql` now creates `xp_in_level INTEGER NOT NULL DEFAULT 0`
- This now matches `backend/app/models/user.py`

**Why This Is Done**
- Fresh schema-created databases no longer mismatch the `User` ORM model
- Backend auth-flow tests now pass against a fresh temporary DB created from `data/db/schema.sql`

**Validation**
- `PYTHONPATH=backend backend/.venv/bin/python -m unittest backend.tests.test_auth_flow`

## Issue 2: Successful validations fail on fresh DBs because `xp_logs` is never created

**Status:** Done

**What Changed**
- `data/db/schema.sql` now creates `xp_logs`
- The schema includes `usuario_id`, `cantidad`, `fuente`, and `fecha`
- `backend/tests/test_auth_flow.py` now includes XP log coverage through `award_xp()`

**Why This Is Done**
- Fresh schema-created databases now support the `XpLog` model used by `backend/app/services/xp_service.py`
- The backend test suite verifies that awarding XP persists an `xp_logs` row successfully

**Validation**
- `PYTHONPATH=backend backend/.venv/bin/python -m unittest backend.tests.test_auth_flow`

## Issue 3: Offline login bypasses password verification

**Status:** Done

**What Changed**
- `frontend/services/auth/authService.ts` no longer returns a cached session when the backend request fails
- Offline login now throws the existing offline error instead of treating a saved email as authentication
- `frontend/tests/unit/auth-service.test.ts` includes a regression test for the cached-session case

**Why This Is Done**
- A user can no longer regain access offline just by knowing the cached email
- The frontend no longer treats local session presence as password verification

**Validation**
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Regression coverage exists in `frontend/tests/unit/auth-service.test.ts`

## Issue 4: Dashboard check-ins toggle twice and cancel themselves out

**Status:** Done

**What Changed**
- `frontend/app/(dashboard)/page.tsx` now calls `toggleCheckin()` once
- The duplicate raw `fetch()` to `/api/checkins/toggle` was removed
- The page refreshes stats and today habits after the single toggle call

**Why This Is Done**
- One tap now maps to one stateful backend toggle instead of two
- The dashboard no longer immediately cancels its own check-in request

**Validation**
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Manual behavior was re-checked during review of the code path

**Residual Gap**
- There is still no dedicated automated regression test for the dashboard toggle flow

## Issue 5: Habit edit screen targeted a broken online API

**Status:** Partially Done

**What Changed**
- `backend/app/routes/habit_routes.py` now exposes `PUT /api/habits/:id` as an explicit `501 Not Implemented`
- `frontend/services/habits/habitService.ts` now rejects immediately in online mode with the same message
- `frontend/app/(dashboard)/habits/[id]/edit/page.tsx` now disables online submission and shows a clear message that cloud editing is not available yet
- Regression coverage was added:
  - `backend/tests/test_auth_flow.py` checks the `501`
  - `frontend/tests/unit/habit-service.test.ts` checks that online `updateHabit()` rejects immediately

**Why The Original Bug Is Fixed**
- The app no longer returns fake success for online habit edits
- The UI no longer suggests that online edit/save is supported when it is not

**What Is Still Wrong**
- Real cloud-backed habit editing is still unimplemented
- `backend/app/services/habit_service.py` still serializes fixed compatibility values like `habit_type: "boolean"` and `frequency: "daily"`
- The current backend schema still does not persist the edit-form fields exposed by the frontend

**Validation**
- `PYTHONPATH=backend backend/.venv/bin/python -m unittest backend.tests.test_auth_flow`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

## Next Fix: Implement real cloud habit editing

**Priority:** P2

**Problem**
- The blocking bug is gone, but the feature remains incomplete
- Online habit editing is intentionally blocked because the backend still lacks persistence for the edit form fields

**Goal**
- Replace the current "blocked/not implemented" path with a real, persisted online edit flow

**Files Likely To Touch**
- `backend/app/routes/habit_routes.py`
- `backend/app/services/habit_service.py`
- `backend/app/models/habit.py`
- `backend/app/models/user_habit.py`
- `data/db/schema.sql`
- `frontend/services/habits/habitService.ts`
- `frontend/app/(dashboard)/habits/[id]/edit/page.tsx`
- `backend/tests/test_auth_flow.py`
- Additional frontend unit/integration coverage as needed

**Plan**
1. Decide where editable habit fields belong:
   - on the catalog habit record
   - on the user-habit assignment record
   - or in a new persistence structure
2. Update the schema and ORM models so the fields exposed by the edit form have a real backend storage target.
3. Add a real backend update service that validates and persists the edited values.
4. Replace the `501` route with a real `PUT /api/habits/:id` implementation.
5. Update frontend edit/save flow to use the real backend response instead of the current online block.
6. Add regression tests proving that an online edit request persists and returns updated values.

**Acceptance Criteria**
- Online edit submission succeeds for supported fields
- Reloading the habit shows the updated values
- The frontend no longer displays the "cloud edit not available" message once backend persistence exists
- Backend and frontend tests cover the successful online flow

**Validation**
- `PYTHONPATH=backend backend/.venv/bin/python -m unittest backend.tests.test_auth_flow`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
