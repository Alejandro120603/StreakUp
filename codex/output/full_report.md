# StreakUP Mobile Offline Detection Fix Report

## 1. Objective
Fix incorrect offline detection in the mobile app so the Capacitor APK no longer shows false "No internet" errors when the device is actually connected.

Requested outcomes:
- remove hard dependency on `navigator.onLine`
- make the API layer request-first
- fall back to local storage only after real request failure
- ensure registration is not blocked by browser/APK online heuristics
- use `try/catch` instead of pre-checks

## 2. Root Cause
The frontend was using browser connectivity heuristics as a gate before attempting network requests.

Problematic behavior:
- [frontend/services/config/runtime.ts](/home/alexo/projects/streakUP/frontend/services/config/runtime.ts) treated `navigator.onLine === false` as offline
- [frontend/services/api/client.ts](/home/alexo/projects/streakUP/frontend/services/api/client.ts) threw `OfflineModeError` before calling `fetch`
- [frontend/services/auth/authService.ts](/home/alexo/projects/streakUP/frontend/services/auth/authService.ts) blocked login and registration before attempting the request

In a Capacitor APK, `navigator.onLine` is not reliable enough to use as a source of truth. That caused false offline errors even when the backend was reachable.

## 3. Implementation Completed

### 3.1 Runtime offline detection
Updated [frontend/services/config/runtime.ts](/home/alexo/projects/streakUP/frontend/services/config/runtime.ts) so runtime offline mode is now driven only by the explicit env flag:

```env
NEXT_PUBLIC_OFFLINE_MODE=true|false
```

Changes:
- removed `isBrowserOffline()`
- removed `navigator.onLine` from offline detection
- kept `isOfflineModeActive()` as an explicit forced-offline switch for deliberate testing

Result:
- browser/APK online heuristics no longer block requests
- forced offline mode still exists for local testing

### 3.2 API service layer
Updated [frontend/services/api/client.ts](/home/alexo/projects/streakUP/frontend/services/api/client.ts).

Changes:
- preserved the shared API client abstraction
- kept normal auth header injection and response parsing
- kept `OfflineModeError` only for explicit forced offline mode
- preserved `shouldUseOfflineFallback()` for real network/request failures
- removed all browser-status-based request blocking

Behavior now:
- if `NEXT_PUBLIC_OFFLINE_MODE=true`, request is intentionally skipped and offline fallback is used
- otherwise the client always attempts `fetch` first
- if `fetch` fails with a network-level error, feature services can fall back to local storage
- HTTP errors still surface as HTTP errors and are not silently treated as offline

This matches the requested request-first flow:

```text
Attempt request first
If request fails with network/offline failure -> fallback to local storage
```

### 3.3 Auth and registration flow
Updated [frontend/services/auth/authService.ts](/home/alexo/projects/streakUP/frontend/services/auth/authService.ts).

Changes:
- removed `isOfflineModeActive()` pre-check from `login()`
- removed `isOfflineModeActive()` pre-check from `register()`
- kept `try/catch` around the actual API call
- preserved user-facing offline error messages when the request really fails

Result:
- registration no longer fails early because `navigator.onLine` is wrong
- login no longer fails early because `navigator.onLine` is wrong
- registration remains online-only in practice, but that is now enforced by real request failure instead of a false pre-check

### 3.4 Existing offline-capable services
Reviewed the feature services:
- [frontend/services/habits/habitService.ts](/home/alexo/projects/streakUP/frontend/services/habits/habitService.ts)
- [frontend/services/checkins/checkinService.ts](/home/alexo/projects/streakUP/frontend/services/checkins/checkinService.ts)
- [frontend/services/stats/statsService.ts](/home/alexo/projects/streakUP/frontend/services/stats/statsService.ts)
- [frontend/services/pomodoro/pomodoroService.ts](/home/alexo/projects/streakUP/frontend/services/pomodoro/pomodoroService.ts)

These services already followed the correct pattern:
- try API first
- catch network/offline failure
- return local storage fallback

No behavioral rewrite was required there.

## 4. Files Changed

### Application code
- [frontend/services/config/runtime.ts](/home/alexo/projects/streakUP/frontend/services/config/runtime.ts)
- [frontend/services/api/client.ts](/home/alexo/projects/streakUP/frontend/services/api/client.ts)
- [frontend/services/auth/authService.ts](/home/alexo/projects/streakUP/frontend/services/auth/authService.ts)

### Regression tests
- [frontend/tests/register-aliases.mjs](/home/alexo/projects/streakUP/frontend/tests/register-aliases.mjs)
- [frontend/tests/unit/api-client.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/api-client.test.ts)
- [frontend/tests/unit/auth-service.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/auth-service.test.ts)

## 5. Test Coverage Added

### 5.1 API client tests
Added unit coverage in [frontend/tests/unit/api-client.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/api-client.test.ts) for:
- `isOfflineModeActive()` ignoring `navigator.onLine`
- `apiRequest()` still attempting `fetch` even when `navigator.onLine === false`
- explicit forced offline mode still raising `OfflineModeError`
- `shouldUseOfflineFallback()` returning `true` for real network failures and `false` for normal HTTP errors

### 5.2 Auth tests
Added unit coverage in [frontend/tests/unit/auth-service.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/auth-service.test.ts) for:
- `register()` not blocking when `navigator.onLine === false`
- `register()` only showing the offline-registration error after a real failed request

### 5.3 Test runner support
Added [frontend/tests/register-aliases.mjs](/home/alexo/projects/streakUP/frontend/tests/register-aliases.mjs) so Node's built-in test runner can resolve the repo's `@/` imports and extensionless TS imports without introducing a new test dependency.

## 6. Validation Performed

Executed:

```bash
cd frontend && node --experimental-strip-types --import ./tests/register-aliases.mjs --test ./tests/unit/*.test.ts
cd frontend && npm run lint
cd frontend && npm run build
```

Results:
- unit tests passed
- lint passed
- production build passed

## 7. Behavior After Fix

### Online
- requests are attempted even if `navigator.onLine` is incorrectly `false`
- registration works normally when backend connectivity is available
- login works normally when backend connectivity is available
- successful API calls continue to refresh local cache through existing feature services

### Offline
- habits/checkins/stats/pomodoro continue using local fallback after real request failure
- registration still cannot complete without backend connectivity
- login still cannot create a new session offline, but previously saved session behavior remains unchanged

### Forced offline testing
- `NEXT_PUBLIC_OFFLINE_MODE=true` still intentionally forces offline behavior for local/dev testing

## 8. Scope Not Changed
- No backend API changes
- No dependency manifest changes
- No `@capacitor/network` integration in this pass
- No UI redesign or copy rewrite beyond preserving existing service messages

## 9. Final Outcome
The false offline detection issue caused by `navigator.onLine` is removed from the request path.

The app now behaves as intended:
- no hard dependency on `navigator.onLine`
- API requests are attempted first
- local fallback happens after real network failure
- registration is no longer blocked by incorrect browser/APK connectivity detection
- online and offline behavior both remain consistent with the hybrid local-first design
