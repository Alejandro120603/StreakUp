# Full Report: StreakUP Validation Module Recon, Diagnosis, and Repair

## Audit Metadata

- Audit date: 2026-04-12
- Audit timezone: America/Mexico_City
- Scope: habit validation flow only
- Project: StreakUP
- Frontend: Next.js / React
- Backend: Flask / Python
- Report status: recon completed, initial repair implemented

## Executive Summary

The validation module was not missing end to end. The main problem was that the existing flow had become operationally fragile.

The highest-confidence breakage was the request contract between frontend and backend:

- the UI accepted `jpg`, `png`, and `webp`
- the frontend stripped the uploaded file down to raw base64
- the backend always rebuilt that payload as `data:image/jpeg;base64,...`

That meant non-JPEG uploads were being mislabeled before they reached the AI provider.

A second major issue was failure masking:

- provider exceptions were returned as generic service failures
- malformed provider output could be converted into a fake `valido: false` business result

That made the module look like it was "rejecting habits" when the real problem was upstream execution or response parsing.

The implemented repair restored the payload contract, hardened backend validation execution, improved audit persistence, and refreshed dependent frontend state after successful validation.

## 1. Current Architecture of the Validation Module

### End-to-end flow

1. The habits dashboard links a habit card to the validation page:
   - `frontend/app/(dashboard)/habits/page.tsx`
2. The validation page loads the selected user habit from the current habits list:
   - `frontend/app/(dashboard)/habits/validate/page.tsx`
   - `frontend/services/habits/habitService.ts`
3. The user uploads an image and submits validation:
   - `frontend/app/(dashboard)/habits/validate/page.tsx`
4. The frontend validation service sends a POST request to:
   - `POST /api/habits/validate`
   - `frontend/services/validation/validationService.ts`
   - `frontend/services/api/endpoints.ts`
5. The shared API client builds the request, attaches the bearer token, and resolves the base URL from runtime config:
   - `frontend/services/api/client.ts`
   - `frontend/services/config/runtime.ts`
   - `frontend/next.config.ts`
6. Flask registers the validation blueprint under `/api/habits`:
   - `backend/app/__init__.py`
   - `backend/app/routes/validation_routes.py`
7. The validation route requires JWT, parses the request payload, and delegates to the validation service:
   - `backend/app/routes/validation_routes.py`
8. The validation service:
   - resolves the assigned user habit
   - blocks duplicate same-day validations
   - calls the OpenAI-backed image analysis service
   - creates or updates the daily check-in
   - writes XP logs
   - writes validation audit data
   - `backend/app/services/validation_service.py`
9. The OpenAI service:
   - validates configuration
   - builds the multimodal provider request
   - parses the JSON response
   - returns `valido`, `razon`, and `confianza`
   - `backend/app/services/openai_service.py`
10. The frontend renders loading, success, rejection, or transport-error states:
   - `frontend/app/(dashboard)/habits/validate/page.tsx`

### Current public request/response contract

Request:

```json
{
  "habit_id": 123,
  "image_base64": "<raw base64 payload>",
  "mime_type": "image/png"
}
```

Response:

```json
{
  "valido": true,
  "razon": "Photo clearly shows the completed habit.",
  "confianza": 0.92,
  "xp_ganado": 50,
  "nueva_racha": 4
}
```

Legacy compatibility retained:

- the backend route still accepts the older `image` field
- the backend route can still parse `data:<mime>;base64,...` if an older client sends that shape

## 2. What Already Existed Before the Repair

### Frontend

- Validation entry point on the habits page:
  - `frontend/app/(dashboard)/habits/page.tsx`
- Validation UI page with image upload, preview, loading, success, and failure states:
  - `frontend/app/(dashboard)/habits/validate/page.tsx`
- Validation service calling `POST /api/habits/validate`:
  - `frontend/services/validation/validationService.ts`
- Shared API client with auth header injection and normalized error handling:
  - `frontend/services/api/client.ts`
- Runtime API base URL resolution:
  - `frontend/services/config/runtime.ts`
- Dev-time rewrite proxy:
  - `frontend/next.config.ts`

### Backend

- Validation route:
  - `backend/app/routes/validation_routes.py`
- Validation service with:
  - user-habit lookup
  - duplicate prevention
  - XP awarding
  - check-in creation/update
  - validation log creation
  - `backend/app/services/validation_service.py`
- OpenAI-backed provider service:
  - `backend/app/services/openai_service.py`

### Persistence

- Check-in table/model:
  - `backend/app/models/checkin.py`
- Validation log table/model:
  - `backend/app/models/validation_log.py`
- XP log table/model:
  - `backend/app/models/xp_log.py`
- Validation-related schema present in baseline migration and SQL bootstrap:
  - `backend/migrations/versions/0001_initial_baseline.py`
  - `data/db/schema.sql`

### Tests

- Existing backend operational-readiness coverage for validation disabled mode:
  - `backend/tests/test_operational_readiness.py`
- Existing backend XP consistency coverage touching validation behavior:
  - `backend/tests/test_xp_consistency.py`

## 3. What Was Broken

### Confirmed issues found during recon

#### 1. MIME type was lost between UI and provider

- Files:
  - `frontend/app/(dashboard)/habits/validate/page.tsx`
  - `frontend/services/validation/validationService.ts`
  - `backend/app/services/openai_service.py`
- Exact issue:
  - the frontend sent only raw base64
  - the backend always constructed `data:image/jpeg;base64,...`
  - PNG and WebP uploads were mislabeled as JPEG
- Impact:
  - non-JPEG uploads could fail at the provider layer or be misinterpreted
- Status: confirmed

#### 2. Provider parse failures could become fake rejections

- File:
  - `backend/app/services/openai_service.py`
- Exact issue:
  - malformed or non-JSON provider output could be treated as:
    - `valido: false`
    - a business rejection instead of an infrastructure/provider failure
- Impact:
  - users and developers could see "validation failed" when the real issue was parse failure
- Status: confirmed

#### 3. Provider/network failures were weakly diagnosable

- Files:
  - `backend/app/services/openai_service.py`
  - `backend/app/routes/validation_routes.py`
- Exact issue:
  - upstream failures were flattened into generic backend failures with limited route-level signal
- Impact:
  - difficult to distinguish:
    - auth/config issue
    - provider outage
    - malformed response
    - local request problem
- Status: confirmed

#### 4. Validation audit persistence was too thin

- Files:
  - `backend/app/services/validation_service.py`
  - `backend/app/models/validation_log.py`
- Exact issue:
  - the validation log persisted only minimal state and did not preserve the evidence metadata needed for debugging
- Impact:
  - low auditability
  - hard to explain disputed validations
  - poor observability for false negatives/positives
- Status: confirmed

#### 5. Successful validation did not refresh dependent frontend state

- File:
  - `frontend/app/(dashboard)/habits/validate/page.tsx`
- Exact issue:
  - after a success, dashboard-adjacent data such as today's habits and stats could remain stale until a later fetch
- Impact:
  - validation appeared to work on the page itself while the rest of the product lagged behind
- Status: confirmed

### Environment and runtime risks identified during recon

#### 6. Backend and frontend env responsibilities were easy to confuse

- Files:
  - `frontend/.env.local`
  - `backend/.env.local`
  - `backend/app/config.py`
- Exact issue:
  - an API key present only in frontend env does not configure the Flask backend
  - the backend requires its own `OPENAI_API_KEY`
- Impact:
  - a developer can believe validation is configured while the backend still reports it as unavailable
- Status: confirmed

#### 7. Connected runtime still depends on correct API base URL and CORS

- Files:
  - `frontend/services/config/runtime.ts`
  - `frontend/next.config.ts`
  - `backend/app/config.py`
- Exact issue:
  - `next dev` can work through the rewrite path while hosted or direct-connected flows depend on:
    - `NEXT_PUBLIC_API_URL`
    - backend CORS alignment
- Impact:
  - validation may work locally in one mode and fail in another
- Status: confirmed risk

## 4. What Was Missing

Before the repair, the module lacked:

- a strict request contract that preserved MIME type
- base64 validation and payload-size guarding before hitting the AI provider
- clear separation between:
  - user-level validation rejection
  - infrastructure/provider failure
- meaningful validation audit metadata in persistence
- success-path refresh of dependent frontend views
- a regression test asserting the frontend sends the correct validation payload

Still not fully complete after this repair:

- full end-to-end integration tests that exercise the live Flask route with mocked provider success and failure
- deployment/runtime validation in the actual target environment
- explicit env documentation for every supported runtime mode if this will ship beyond local development

## 5. Root Cause Analysis

### Ranked causes by confidence

#### 1. Highest confidence: broken payload contract

The strongest confirmed root cause was the image contract mismatch.

- the browser knew the real MIME type
- the frontend discarded it
- the backend hardcoded JPEG

That directly breaks correctness for `png` and `webp`.

#### 2. High confidence: failure masking created false diagnosis

The provider layer could fail while the app surfaced either:

- a generic transport failure
- or a fake business rejection

That prevented accurate diagnosis and made the module appear inconsistent.

#### 3. High confidence: weak auditability made debugging harder

Even when validation executed, the system did not store enough evidence metadata to understand what happened later.

#### 4. Medium confidence: environment ownership is split across frontend and backend

The module requires correct configuration in both apps:

- frontend must know where to call
- backend must have the provider key and allow the runtime origin

That increases the chance of "works here, fails there" behavior.

## 6. Gap Between Current State and Desired State

### Before the repair

The codebase already had a real validation feature, but it was not production-ready because:

- request data was lossy
- provider failures were not cleanly classified
- validation audit data was too sparse
- frontend success did not propagate to related views
- runtime configuration remained easy to misapply

### After the repair

The gap is smaller, but not zero.

What still separates the current state from a production-ready validation module:

- real deployment env verification
- explicit validation of backend CORS and API URL alignment in the target runtime
- higher-level integration coverage around the Flask route and provider mocks

## 7. Implementation Plan and Execution Status

### Phase 1: Restore contract and connectivity

Goal:

- preserve the uploaded image type end to end
- accept the new request contract without breaking older clients

Files changed:

- `frontend/services/validation/validationService.ts`
- `frontend/app/(dashboard)/habits/validate/page.tsx`
- `backend/app/routes/validation_routes.py`

Expected outcome:

- the backend receives both raw base64 and the actual MIME type
- legacy callers still work

Execution status: completed

Risks remaining:

- runtime env still needs to be correct in the real environment

### Phase 2: Restore backend validation execution

Goal:

- make provider execution stricter and more diagnosable

Files changed:

- `backend/app/services/openai_service.py`
- `backend/app/services/validation_service.py`

Expected outcome:

- invalid payloads are rejected earlier
- malformed provider output becomes a provider failure, not a fake rejection
- validation records retain useful audit metadata

Execution status: completed

Risks remaining:

- live provider behavior still depends on real API credentials and runtime networking

### Phase 3: Restore frontend rendering and UX states

Goal:

- keep the validation page correct and refresh adjacent state after success

Files changed:

- `frontend/app/(dashboard)/habits/validate/page.tsx`

Expected outcome:

- success on the validation page is reflected in dependent habit/stat state

Execution status: completed

Risks remaining:

- no browser-level end-to-end UI automation was run in this workspace

### Phase 4: Persistence, testing, and hardening

Goal:

- add a minimal regression guard without widening the diff

Files changed:

- `frontend/tests/unit/validation-service.test.ts`

Expected outcome:

- the frontend payload contract is now covered by a unit test

Execution status: partially completed

Not yet completed:

- backend route-level integration tests
- deployment env validation in the target hosted runtime

## 8. Implemented Changes

### Frontend

#### `frontend/services/validation/validationService.ts`

Changed:

- `validateHabit()` now accepts `mimeType`
- the request body now sends:
  - `habit_id`
  - `image_base64`
  - `mime_type`

Why:

- restore the real payload contract instead of assuming JPEG

#### `frontend/app/(dashboard)/habits/validate/page.tsx`

Changed:

- tracks uploaded file MIME type in component state
- sends the real MIME type to the validation service
- clears MIME state when the image is removed
- refreshes today's habits and stats after successful validation

Why:

- preserve upload fidelity
- keep the rest of the app in sync after success

#### `frontend/tests/unit/validation-service.test.ts`

Changed:

- added a regression test asserting that validation requests include `image_base64` and `mime_type`

Why:

- prevent the contract regression from returning silently

### Backend

#### `backend/app/routes/validation_routes.py`

Changed:

- added request extraction logic that:
  - supports `image_base64`
  - supports legacy `image`
  - can infer MIME type from a `data:` URL
- passes `mime_type` into the validation service

Why:

- support the corrected contract without instantly breaking older callers

#### `backend/app/services/openai_service.py`

Changed:

- validates supported MIME types
- normalizes `image/jpg` to `image/jpeg`
- validates and sanitizes base64 payloads
- applies a decoded payload size limit
- uses the real MIME type in the provider request
- applies a provider timeout
- logs provider failures
- treats malformed provider output as provider failure

Why:

- make validation execution deterministic and diagnosable

#### `backend/app/services/validation_service.py`

Changed:

- accepts `mime_type`
- passes `mime_type` to the provider service
- stores structured validation metadata in `ValidationLog.evidencia`

Stored audit metadata now includes:

- provider
- MIME type
- reason
- confidence
- XP awarded
- image SHA-256 hash

Why:

- improve observability without requiring a schema change

## 9. Validation Performed

### Checks executed

Backend syntax validation:

```bash
python3 -m py_compile \
  backend/app/routes/validation_routes.py \
  backend/app/services/openai_service.py \
  backend/app/services/validation_service.py
```

Result:

- passed

Frontend typecheck:

```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false
```

Result:

- passed

### What was not executed here

- live OpenAI provider call
- full backend integration test run with Flask app dependencies installed
- browser automation of the validation screen

Reason:

- this workspace does not currently have the full Flask/OpenAI runtime dependencies installed for live integration execution

## 10. Residual Risks

- If `OPENAI_API_KEY` is not present in backend runtime env, validation will still be unavailable.
- If `NEXT_PUBLIC_API_URL` or equivalent connected runtime config is wrong, the frontend can still fail before reaching Flask.
- If backend CORS is not aligned for the actual runtime origin, direct-connected browser flows can still fail.
- The module still needs route-level integration tests for stronger regression protection.

## 11. Recommended First Next Verification

The single best next verification step is to run the real Flask backend in the intended connected environment and confirm all of these together:

- backend has `OPENAI_API_KEY`
- frontend is calling the intended backend URL
- CORS allows the frontend origin
- a real PNG upload and a real WebP upload both reach the provider successfully

## 12. POINT A

### Where we are now

The validation module exists end to end and the most important confirmed defects in the request and provider path have been repaired.

### What works

- UI trigger and validation page
- frontend service and API client path
- Flask validation route
- validation service logic
- XP/check-in persistence
- stricter provider request and response handling

### What does not fully work yet

- production-readiness is still not proven in the actual deployment runtime
- env alignment and CORS still need live verification
- full integration coverage is still incomplete

### What had to be fixed first

The first required fix was the payload contract:

- preserve the uploaded MIME type
- send it explicitly
- consume it explicitly
- stop hardcoding JPEG

That was the highest-confidence functional defect in the real validation path.
