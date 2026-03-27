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
# StreakUP Frontend Architecture Report

## 1. Objective
Design a professional, scalable frontend architecture for **StreakUP** using:
- Node.js (development/build environment)
- Next.js (App Router)
- React
- TypeScript

Scope is architecture design only. No implementation code is included.

## 2. Context
StreakUP is a habit-tracking and gamified productivity application. The frontend must support:
- Mobile-first user app
- Web admin panel
- API consumption from a Flask backend
- JWT authentication
- Global and feature-level state management
- Modular, production-ready scalability

## 3. Complete Proposed Folder Tree (`/frontend`)
```text
frontend/
├─ app/                                  # Next.js App Router (convention)
│  ├─ (mobile)/                          # Mobile/user route group (convention)
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ habits/
│  │  │  └─ page.tsx
│  │  ├─ streaks/
│  │  │  └─ page.tsx
│  │  ├─ challenges/
│  │  │  └─ page.tsx
│  │  └─ profile/
│  │     └─ page.tsx
│  ├─ (admin)/                           # Admin route group (convention)
│  │  └─ admin/
│  │     ├─ layout.tsx
│  │     ├─ page.tsx
│  │     ├─ users/
│  │     │  └─ page.tsx
│  │     ├─ habits/
│  │     │  └─ page.tsx
│  │     └─ analytics/
│  │        └─ page.tsx
│  ├─ api/                               # Optional Next route handlers/BFF (convention)
│  │  └─ health/
│  │     └─ route.ts
│  ├─ layout.tsx                         # Root layout (convention)
│  ├─ page.tsx                           # Root page (convention)
│  ├─ loading.tsx                        # Loading boundary (convention)
│  ├─ error.tsx                          # Error boundary (convention)
│  ├─ not-found.tsx                      # 404 boundary (convention)
│  └─ globals.css                        # Global stylesheet entry (convention)
├─ components/
│  ├─ ui/                                # Shared presentational primitives
│  ├─ forms/                             # Reusable form components
│  ├─ layout/                            # Shared layout components
│  └─ feedback/                          # Loading/error/empty UI
├─ features/                             # Domain/business modules
│  ├─ auth/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/
│  │  ├─ state/
│  │  ├─ types/
│  │  └─ validators/
│  ├─ habits/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/
│  │  ├─ state/
│  │  ├─ types/
│  │  └─ validators/
│  ├─ streaks/
│  ├─ challenges/
│  ├─ rewards/
│  └─ admin/
│     ├─ users/
│     ├─ moderation/
│     └─ analytics/
├─ hooks/                                # Cross-feature hooks only
├─ services/
│  ├─ api/
│  │  ├─ client.ts                       # HTTP client wrapper
│  │  ├─ endpoints.ts                    # API endpoint map
│  │  └─ error-map.ts                    # Backend error normalization
│  ├─ auth/
│  │  ├─ token-storage.ts                # JWT storage abstraction
│  │  └─ session.ts                      # Auth/session lifecycle helpers
│  └─ telemetry/
│     └─ analytics.ts
├─ state/
│  ├─ store.ts                           # Global store configuration
│  ├─ app.slice.ts                       # Global app/session state
│  └─ selectors.ts
├─ providers/
│  ├─ AppProviders.tsx                   # Root provider composition
│  └─ AuthGuard.tsx                      # Auth gate component
├─ lib/
│  ├─ env.ts                             # Typed environment access
│  ├─ http.ts                            # Low-level HTTP helpers
│  └─ logger.ts
├─ utils/
│  ├─ date.ts
│  ├─ format.ts
│  └─ guards.ts
├─ types/
│  ├─ api.ts
│  ├─ auth.ts
│  ├─ habits.ts
│  └─ common.ts
├─ styles/
│  ├─ tokens.css
│  ├─ utilities.css
│  └─ themes/
│     ├─ mobile.css
│     └─ admin.css
├─ config/
│  ├─ app.config.ts
│  ├─ routes.ts
│  └─ navigation.ts
├─ constants/
│  ├─ query-keys.ts
│  ├─ roles.ts
│  └─ limits.ts
├─ public/                               # Static assets (convention)
│  ├─ icons/
│  └─ images/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  └─ fixtures/
├─ middleware.ts                         # Next middleware (convention)
├─ next.config.ts                        # Next config (convention)
├─ tsconfig.json
├─ package.json
└─ .env.example
```

## 4. Purpose of Main Folders
- `app/`: Routes, layouts, and route-level boundaries.
- `components/`: Reusable UI building blocks without business logic.
- `features/`: Domain modules that contain business logic and feature-specific UI.
- `hooks/`: Shared reusable hooks across features.
- `services/`: API/auth/integration logic.
- `state/`: Global state store and selectors.
- `utils/`: Generic helpers.
- `types/`: Shared TypeScript contracts.
- `styles/`: Global styling, tokens, and themes.
- `providers/`: App-wide provider composition.
- `config/`: Central route/app/navigation config.
- `constants/`: Shared immutable constants.
- `tests/`: Unit/integration/e2e test structure.

## 5. Next.js Convention Folders and Files
Framework-conventional items:
- `app/`
- `app/**/page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `app/api/**/route.ts`
- `public/`
- `middleware.ts`
- `next.config.ts`

## 6. Additional Scalability Recommendations
Beyond minimum requirements, add:
- `providers/` to centralize app wiring (auth, state, query clients, themes).
- `config/` and `constants/` to avoid hardcoded route keys and business limits.
- `lib/` for low-level reusable technical helpers.
- `tests/` with explicit layers from the beginning.

## 7. Architecture Rationale
- Keep UI and business logic separated by default.
- Use feature-first modularity for long-term growth.
- Keep API and JWT handling centralized and typed.
- Support mobile and admin inside one Next.js app via route groups.

## 8. Outcome
This structure is production-ready, modular, and aligned with Next.js App Router conventions while meeting all requested frontend requirements for StreakUP.
