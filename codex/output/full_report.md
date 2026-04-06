# Full Report: Authentication and JWT Session Repair

## Summary

The authentication stack is now aligned to the required flow:

`login -> JWT token -> protected request -> user_id from token -> user-scoped DB query`

The implemented fix set focused on three concrete issues:

1. Startup seed logic was mutating the real database and privileging one account.
2. The frontend could treat stale local storage as a successful login without a fresh backend JWT.
3. The repo lacked an integration test that proved user isolation across real JWT-protected requests.

## Root Causes

### 1. Seed user logic was rewriting the live database

File:

- `backend/app/services/auth_service.py`

Previous behavior:

- `ensure_seed_user()` ran on every startup
- if `daniel@correo.com` existed but the password did not match `12345678`, it reset that password
- this meant startup could silently modify the production-like local DB

Observed runtime effect:

- the real database contained three users:
  - `daniel@correo.com`
  - `gustavo@correo.com`
  - `adrian@correo.com`
- only Daniel could log in with the forced seed password
- startup behavior was not respecting existing DB users as required by the brief

### 2. Frontend login was not strictly database-backed

File:

- `frontend/services/auth/authService.ts`

Previous behavior:

- if the login request failed with a network error, the frontend restored a matching saved session from `localStorage`
- this bypassed the required contract that login must succeed through `POST /api/auth/login` and return a fresh JWT

Impact:

- the UI could appear authenticated without a live backend login
- session independence could be undermined by stale local auth state

### 3. Client auth state trusted raw storage too much

Relevant files:

- `frontend/services/auth/authService.ts`
- `frontend/app/(dashboard)/layout.tsx`

Previous behavior:

- stored auth state was accepted if token and user JSON existed
- malformed stored JSON or invalid token shape could leave the app in an inconsistent auth state

## What Changed

### Backend

#### 1. `ensure_seed_user()` is now non-destructive

Updated file:

- `backend/app/services/auth_service.py`

New behavior:

- if the database already contains any users, the seed routine exits immediately
- the seed user is only created for an empty database
- existing users and existing password hashes are left untouched

Result:

- startup no longer overrides real DB data
- seed logic now behaves like bootstrap logic, not repair logic

#### 2. JWT login flow was preserved and validated

The working backend auth path remains:

- `login_user(email, password)`
- lookup user by normalized email
- verify password with the model’s hash check
- issue token with `create_access_token(identity=str(user.id), ...)`
- protected routes resolve the authenticated user with `get_jwt_identity()`

Current effective flow:

```python
user = User.query.filter_by(email=email.strip().lower()).first()

if user is None or not user.check_password(password):
    raise ValueError("Invalid email or password.")

access_token = create_access_token(
    identity=str(user.id),
    additional_claims={"role": user.role, "username": user.username},
)
```

Protected route usage remains:

```python
@jwt_required()
def list_habits():
    user_id = int(get_jwt_identity())
    habits = get_habits(user_id)
```

### Frontend

#### 1. Login now requires a real backend response

Updated file:

- `frontend/services/auth/authService.ts`

New behavior:

- offline fallback no longer restores a saved session during login
- if the backend cannot be reached, login fails with:

```text
No hay conexión. El inicio de sesión requiere conexión.
```

This makes login fully DB-backed.

#### 2. Session helpers now validate stored auth state

Updated file:

- `frontend/services/auth/authService.ts`

Added/updated behavior:

- centralized token helpers:
  - `getToken()`
  - `setToken()`
  - `removeToken()`
- JWT payload is parsed from the token
- malformed tokens are rejected
- expired tokens are rejected
- malformed stored user payloads are rejected
- any invalid stored auth state is cleared immediately with `clearSession()`

This means protected pages rely on validated auth state, not just raw localStorage presence.

#### 3. Existing 401 handling remains active

Already-active behavior retained:

- `frontend/services/api/client.ts` adds `Authorization: Bearer <token>`
- on `401`, it clears storage and redirects to `/login`
- auth endpoints can opt out of this redirect path with `redirectOnUnauthorized: false`

## User ID Flow

The repaired end-to-end flow is now:

### 1. Login

Frontend:

- calls `POST /api/auth/login`

Backend:

- loads user by email from the database
- checks hashed password
- returns:
  - `access_token`
  - `refresh_token`
  - `user`

### 2. Token persistence

Frontend:

- saves the backend-issued JWT to `localStorage`
- saves user payload and refresh token

### 3. Protected request

Frontend API client:

- reads token with `getToken()`
- sends:

```http
Authorization: Bearer <token>
```

### 4. User resolution on backend

Protected Flask route:

- requires `@jwt_required()`
- extracts identity with `get_jwt_identity()`
- converts identity to `user_id`

### 5. DB query scoping

Service layer:

- uses `user_id` in ORM filters, for example:

```python
Habit.query.filter_by(user_id=user_id)
```

Result:

- each request is tied to a specific authenticated user
- each user only sees their own habits and derived stats

## Tests Added and Updated

### Backend

Updated:

- `backend/tests/test_seed_user.py`

New assertions:

- seed user exists for empty DB startup
- seed user password is not rewritten after startup
- seed user is not injected into an already populated DB

Added:

- `backend/tests/test_auth_flow.py`

New coverage:

- login returns `access_token`, `refresh_token`, and user payload
- decoded JWT `sub` matches the DB user id
- protected route rejects missing token with `401`
- two users with two different tokens only see their own habits

### Frontend

Updated:

- `frontend/tests/unit/auth-service.test.ts`

New coverage:

- login fails offline instead of restoring a cached session
- malformed stored user data is cleared
- expired JWTs invalidate the saved session and clear storage

Existing coverage kept:

- invalid credentials on login do not trigger the global unauthorized redirect path
- register also avoids the global unauthorized redirect path

## Validation Performed

### Runtime verification

Confirmed locally with Flask test client:

- `POST /api/auth/login` returns `200`
- returned token successfully authorizes `GET /api/habits`
- `GET /api/habits` without a token returns `401`

### Database inspection

Confirmed the live SQLite DB contains real users and that startup behavior must not override them.

### Automated tests

Backend:

```bash
cd /home/alexo/projects/streakUP/backend
.venv/bin/python -m unittest discover -s tests
```

Result:

- `Ran 8 tests`
- `OK`

Frontend:

```bash
cd /home/alexo/projects/streakUP/frontend
node --import ./tests/register-aliases.mjs --test tests/unit/*.test.ts
```

Result:

- `2` test files passed
- `0` failures

## Files Changed

Backend:

- `backend/app/services/auth_service.py`
- `backend/tests/test_seed_user.py`
- `backend/tests/test_auth_flow.py`

Frontend:

- `frontend/services/auth/authService.ts`
- `frontend/tests/unit/auth-service.test.ts`

## Final Outcome

Authentication is now tied to the database instead of stale local session restoration.

Confirmed outcomes:

- login uses DB credentials and hashed password verification
- successful login returns a valid JWT
- protected requests resolve `user_id` from the JWT
- user data access stays scoped to the authenticated user
- invalid or expired client auth state is cleared instead of being trusted
- startup seed logic no longer mutates a populated database
