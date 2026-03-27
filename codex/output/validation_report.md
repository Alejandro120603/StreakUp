# StreakUP Validation Report

## 1. Scope
This report validates the current implementation only.

No new features were implemented during this validation.

Validation areas covered:
- offline mode
- online mode
- data consistency
- Capacitor + Android build
- Makefile targets
- `update-apk-auto` flow
- error handling
- code quality and risks

## 2. Validation Summary

### ✅ What is working correctly

#### Offline mode structure
- Offline mode flag exists through `NEXT_PUBLIC_OFFLINE_MODE` and runtime helpers in [runtime.ts](/home/alexo/projects/streakUP/frontend/services/config/runtime.ts).
- Shared service-layer methods exist:
  - `apiGet`
  - `apiPost`
  - `apiPut`
  - `apiDelete`
  in [client.ts](/home/alexo/projects/streakUP/frontend/services/api/client.ts).
- Local persistence is implemented using `localStorage` in [localData.ts](/home/alexo/projects/streakUP/frontend/services/storage/localData.ts).
- Local persistence covers:
  - habits
  - checkins/progress
  - Pomodoro sessions
- Code scan confirmed there are no remaining direct `fetch` or `axios` calls in app pages or feature services; the only remaining `fetch` is the expected centralized one in the shared API client.

#### Online mode structure
- Backend-first service flow is preserved.
- Auth, habits, checkins, stats, and Pomodoro all go through service modules instead of page-level HTTP logic.
- Successful online responses update local cache for habits, checkins, and Pomodoro sessions.

#### Data shape consistency
- Habit local structure matches backend habit structure:
  - `id`
  - `user_id`
  - `name`
  - `icon`
  - `habit_type`
  - `frequency`
  - `section`
  - `target_duration`
  - `pomodoro_enabled`
  - `target_quantity`
  - `target_unit`
  - `created_at`
  - `updated_at`
- Pomodoro local structure matches backend Pomodoro session structure:
  - `id`
  - `user_id`
  - `habit_id`
  - `theme`
  - `study_minutes`
  - `break_minutes`
  - `cycles`
  - `completed`
  - `started_at`
  - `completed_at`
- Local stats computation mirrors backend stats logic for:
  - `streak`
  - `today_completed`
  - `today_total`
  - `completion_rate`

#### Capacitor + Android
- Capacitor dependencies are installed in [package.json](/home/alexo/projects/streakUP/frontend/package.json).
- Capacitor config exists and points to exported Next assets in [capacitor.config.json](/home/alexo/projects/streakUP/frontend/capacitor.config.json).
- Android project exists at `/home/alexo/projects/streakUP/android`.
- `make sync_android` passed.
- `make build_apk` passed outside sandbox.

#### Makefile
- The following targets exist:
  - `make build_frontend`
  - `make sync_android`
  - `make build_apk`
  - `make update-apk-auto`
  - `make run_backend`
  - `make run_frontend`
  - `make run_local`
  - `make dev`
- Guard clauses for missing backend virtualenv, missing Capacitor deps, and missing Android project are present and produce readable errors.

#### Full APK flow
- `make update-apk-auto` completed successfully outside sandbox.
- Verified sequence:
  1. frontend build
  2. Capacitor sync
  3. Gradle debug APK build
  4. final APK path output
- Final APK path is correct:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 3. Commands Executed

### Code and structure validation
```bash
rg -n "fetch\\(|axios|NEXT_PUBLIC_API_URL|NEXT_PUBLIC_OFFLINE_MODE|isOfflineMode|apiGet\\(|apiPost\\(|apiPut\\(|apiDelete\\(" frontend --glob '!node_modules'
find frontend/services -maxdepth 4 -type f | sort
```

### Frontend / Capacitor / APK validation
```bash
make build_frontend
make sync_android
make build_apk
make update-apk-auto
```

### Runtime smoke tests
```bash
make run_backend
make run_frontend
make run_local
```

### Error handling checks
```bash
make run_backend PYTHON_BIN=/tmp/streakup-missing-python
make sync_android FRONTEND_DIR=/tmp/streakup-missing-frontend CAP_CONFIG=/tmp/streakup-missing-frontend/capacitor.config.json ANDROID_DIR=/tmp/streakup-missing-android
make build_apk ANDROID_DIR=/tmp/streakup-missing-android APK_DEBUG_PATH=/tmp/streakup-missing-android/app-debug.apk
```

## 4. Issues Found

### ❌ Issue 1: Today-habits cache can overwrite the full habit cache
Severity: Critical

Location:
- [localData.ts](/home/alexo/projects/streakUP/frontend/services/storage/localData.ts)

Problem:
- `cacheTodayHabits()` calls `cacheHabits()`.
- `cacheHabits()` replaces the entire stored habit list for the user.
- But `/api/checkins/today` only returns daily habits, not all habits.

Impact:
- After a successful online dashboard load, weekly habits can be dropped from local storage.
- This breaks offline consistency and can make habits disappear when switching modes.

Why it matters:
- Offline habit retrieval is no longer reliable after a dashboard sync.

### ❌ Issue 2: Request failures do not always trigger local fallback
Severity: Critical

Location:
- [client.ts](/home/alexo/projects/streakUP/frontend/services/api/client.ts)

Problem:
- `shouldUseOfflineFallback()` only returns `true` for:
  - `OfflineModeError`
  - `TypeError`
- `apiRequest()` throws a regular `Error` for HTTP failures such as:
  - 500
  - 502
  - 503
  - 404
  - other non-2xx responses

Impact:
- If the backend is reachable but failing, services do not fall back to local storage.
- This does not fully satisfy the requirement:

```text
If offline OR request fails → fallback to local storage
```

Why it matters:
- Online mode with API instability will not degrade gracefully into local mode.

### ❌ Issue 3: Missing explicit frontend dependency guard in some Make targets
Severity: Medium

Location:
- [Makefile](/home/alexo/projects/streakUP/Makefile)

Problem:
- `run_frontend` and `build_frontend` check for `package.json`, but not for `node_modules`.
- `sync_android` has a much better dependency guard, but frontend-only targets do not.

Impact:
- If `node_modules` is missing, the failure happens later inside `npm run dev` or `npm run build`.
- The error is less precise than it could be.

Why it matters:
- The Makefile is intended to fail safely and helpfully.

## 5. Risks / Edge Cases

### ⚠️ Offline flag naming mismatch with the original spec
- The implementation uses `NEXT_PUBLIC_OFFLINE_MODE` plus helper functions.
- The original prompt asked for `IS_OFFLINE_MODE`.
- Functionally this is acceptable, but the naming does not exactly match the request.

### ⚠️ Offline auth depends on a previously saved session
- Offline login does not create a new authenticated session.
- First-time offline use is not supported.
- This is consistent with the implemented plan, but it should be treated as a known behavior.

### ⚠️ Sandbox startup failures are environmental
- `make run_backend`, `make run_frontend`, and `make run_local` failed in the sandbox because binding to ports was not permitted.
- The same targets started successfully outside sandbox.
- This is not a repo bug, but it is relevant when reproducing validation in restricted environments.

### ⚠️ Offline edit/delete still depends on cached data presence
- Local edit/delete flows assume the relevant habit already exists in local cache.
- If a user goes offline before the app has cached a given habit, local edit/update can still fail.

## 6. Suggested Fixes

### 🔧 Fix 1: Do not replace the full habit cache from `/api/checkins/today`
Minimal fix:
- Change `cacheTodayHabits()` so it only updates daily habits or only syncs checkin state.
- Do not use the `/today` response to overwrite the full habit collection.

### 🔧 Fix 2: Broaden fallback logic for API failure responses
Minimal fix:
- Extend fallback detection so backend request failures that represent unavailable or failed API behavior also fall back to local data.
- At minimum, treat HTTP 5xx responses as fallback-eligible.
- Decide deliberately whether selected 4xx errors should also remain online-only or fall back.

### 🔧 Fix 3: Add explicit `node_modules` guards to frontend targets
Minimal fix:
- Add checks similar to `sync_android` in:
  - `run_frontend`
  - `run_local`
  - `build_frontend`

Example behavior:
- If `frontend/node_modules` is missing, print:

```text
Frontend dependencies not found in frontend. Run: cd frontend && npm install
```

## 7. Final Verdict

### 🚀 Final verdict: NEEDS FIXES

Reason:
- The full build and APK pipeline is working.
- `make update-apk-auto` succeeds and produces the correct debug APK.
- But two critical functional issues remain in the local-first behavior:
  - dashboard today-sync can corrupt the local habit cache
  - backend HTTP failures do not consistently fall back to local storage

Because of those issues, the implementation is close, but not fully validation-complete for the requested offline/online resilience guarantees.

## 8. Final APK Path

Validated output:
- [app-debug.apk](/home/alexo/projects/streakUP/android/app/build/outputs/apk/debug/app-debug.apk)
