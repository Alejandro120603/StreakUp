# StreakUP Recon Report: Upcoming Habit Validation, Timer, Customization, and XP Expansion

Date: 2026-04-15

This report is based on direct inspection of the current repository state. It focuses only on the requested upcoming features:

1. Strict streak behavior
2. Validation by habit type
3. Pomodoro / timer habits
4. Text validation
5. Habit customization
6. More habit detail
7. Achievements / XP expansion

Facts are grounded in the current repo. Where something is inferred, it is labeled as an inference.

## A. CURRENT STATE OF THE SYSTEM

### 1. Repository structure and source of truth

The app is split into:

- `backend/`: Flask + SQLAlchemy + Alembic
- `frontend/`: Next.js app with service layers and offline/local-storage support

Current hosted/backend source of truth:

- DB schema: [backend/migrations/versions/0001_initial_baseline.py](/home/alexo/projects/streakUP/backend/migrations/versions/0001_initial_baseline.py:18), [backend/migrations/versions/0002_add_pomodoro_sessions.py](/home/alexo/projects/streakUP/backend/migrations/versions/0002_add_pomodoro_sessions.py:18)
- ORM models: [backend/app/models/habit.py](/home/alexo/projects/streakUP/backend/app/models/habit.py:21), [backend/app/models/user_habit.py](/home/alexo/projects/streakUP/backend/app/models/user_habit.py:15), [backend/app/models/checkin.py](/home/alexo/projects/streakUP/backend/app/models/checkin.py:13), [backend/app/models/validation_log.py](/home/alexo/projects/streakUP/backend/app/models/validation_log.py:13), [backend/app/models/pomodoro_session.py](/home/alexo/projects/streakUP/backend/app/models/pomodoro_session.py:13), [backend/app/models/xp_log.py](/home/alexo/projects/streakUP/backend/app/models/xp_log.py:16)
- Backend route registration: [backend/app/__init__.py](/home/alexo/projects/streakUP/backend/app/__init__.py:17)

Local SQLite convenience source:

- [data/db/schema.sql](/home/alexo/projects/streakUP/data/db/schema.sql:1)
- [data/db/seed.sql](/home/alexo/projects/streakUP/data/db/seed.sql:1)

The repo explicitly states hosted source of truth is Alembic + ORM, not `schema.sql`: [data/db/schema.sql](/home/alexo/projects/streakUP/data/db/schema.sql:3).

### 2. Habits

#### Catalog habits

Catalog habits live in table `habitos` and model `Habit`:

- Columns: `id`, `categoria_id`, `nombre`, `descripcion`, `dificultad`, `xp_base`
- Model: [backend/app/models/habit.py](/home/alexo/projects/streakUP/backend/app/models/habit.py:21)
- Migration: [backend/migrations/versions/0001_initial_baseline.py](/home/alexo/projects/streakUP/backend/migrations/versions/0001_initial_baseline.py:43)

There is no backend catalog field for:

- evidence type
- validation type
- target quantity
- target duration
- target unit
- frequency
- pomodoro-enabled flag

Catalog seed source for hosted environments is the bootstrap service:

- [backend/app/services/catalog_bootstrap_service.py](/home/alexo/projects/streakUP/backend/app/services/catalog_bootstrap_service.py:13)
- CLI entrypoint: [backend/app/cli.py](/home/alexo/projects/streakUP/backend/app/cli.py:18)

Catalog read routes:

- `GET /api/habitos`
- `GET /api/habits/catalog`
- [backend/app/routes/habit_routes.py](/home/alexo/projects/streakUP/backend/app/routes/habit_routes.py:23)

#### User habits

User habits are not custom habits. They are assignments from a user to a catalog habit through `habitos_usuario`:

- Columns: `id`, `usuario_id`, `habito_id`, `fecha_inicio`, `fecha_fin`, `activo`, `fecha_creacion`
- Model: [backend/app/models/user_habit.py](/home/alexo/projects/streakUP/backend/app/models/user_habit.py:15)
- Migration: [backend/migrations/versions/0001_initial_baseline.py](/home/alexo/projects/streakUP/backend/migrations/versions/0001_initial_baseline.py:57)

There is no current user-level persistence for:

- custom habit name
- user-specific description
- target value
- target time
- evidence type override
- frequency override

Assignment flow:

- Frontend new-habit page only selects a catalog habit: [frontend/app/(dashboard)/habits/new/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/new/page.tsx:13)
- Service sends `{ habito_id }`: [frontend/services/habits/habitService.ts](/home/alexo/projects/streakUP/frontend/services/habits/habitService.ts:37)
- Backend route creates `UserHabit`: [backend/app/routes/habit_routes.py](/home/alexo/projects/streakUP/backend/app/routes/habit_routes.py:30)
- Backend service: [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:105)

Current user habit serialization:

- [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:70)

Important fact: the backend serializer hardcodes:

- `"habit_type": "boolean"`
- `"frequency": "daily"`
- `"target_duration": None`
- `"pomodoro_enabled": False`
- `"target_quantity": None`
- `"target_unit": None`

So the connected backend always tells the frontend that habits are boolean daily habits, regardless of habit name.

### 3. Check-ins / completions

Check-ins are stored in `registro_habitos`:

- Columns: `id`, `habitousuario_id`, `fecha`, `completado`, `xp_ganado`
- Model: [backend/app/models/checkin.py](/home/alexo/projects/streakUP/backend/app/models/checkin.py:13)
- Migration: [backend/migrations/versions/0001_initial_baseline.py](/home/alexo/projects/streakUP/backend/migrations/versions/0001_initial_baseline.py:73)

Check-in creation flow:

- Route: `POST /api/checkins/toggle` in [backend/app/routes/checkin_routes.py](/home/alexo/projects/streakUP/backend/app/routes/checkin_routes.py:19)
- Service: [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:18)

How it works now:

- If no row exists for `(habitousuario_id, fecha)`, the backend creates a `CheckIn` with `completado=True` and `xp_ganado=xp_base`
- If a row exists, it deletes it and revokes XP

This means current completion is a plain toggle. It is not validation-gated.

Frontend usage:

- Dashboard home fetches today habits from `GET /api/checkins/today`: [frontend/services/checkins/checkinService.ts](/home/alexo/projects/streakUP/frontend/services/checkins/checkinService.ts:15)
- Clicking a habit card calls `toggleCheckin`: [frontend/app/(dashboard)/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/page.tsx:78)

This is the current default completion UX.

### 4. Streak calculation

There is no implemented central streak domain service yet:

- [backend/app/services/streak_service.py](/home/alexo/projects/streakUP/backend/app/services/streak_service.py:1)

Current streak logic actually lives in two places:

#### User stats streak

- [backend/app/services/stats_service.py](/home/alexo/projects/streakUP/backend/app/services/stats_service.py:223)

Behavior:

- It computes streak by day if the user has at least one check-in on that date across active habits
- If there is no check-in today and streak is 0, it skips today once and then checks yesterday

This is a user-level streak, not a per-habit strict streak.

#### Validation response streak

- [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:115)

Behavior:

- It computes a per-habit consecutive-day streak based on `CheckIn` rows for that user habit
- It force-adds `today` into `checked_dates`

This is different logic and a different scope from the stats streak.

### 5. XP calculation

XP aggregates are stored on `users`:

- `total_xp`, `level`, `xp_in_level`
- Model: [backend/app/models/user.py](/home/alexo/projects/streakUP/backend/app/models/user.py:16)

XP event history is stored in `xp_logs`:

- `usuario_id`, `cantidad`, `fuente`, `fecha`
- Model: [backend/app/models/xp_log.py](/home/alexo/projects/streakUP/backend/app/models/xp_log.py:16)
- Reasons allowed today: `checkin`, `checkin_undo`, `validation`

XP logic:

- [backend/app/services/xp_service.py](/home/alexo/projects/streakUP/backend/app/services/xp_service.py:87)

How XP works now:

- Manual check-in awards `xp_base` immediately
- Unchecking removes the same amount
- Successful photo validation awards only the missing delta up to `1.5 * xp_base`

Example:

- Base habit XP = 10
- Manual check-in gives 10
- Later successful photo validation upgrades that day to 15 total, so only +5 extra is awarded

This is enforced in:

- [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:45)
- [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:53)

### 6. AI validation

AI validation is photo-only today.

Route:

- `POST /api/habits/validate`
- [backend/app/routes/validation_routes.py](/home/alexo/projects/streakUP/backend/app/routes/validation_routes.py:42)

Accepted payload now:

- `habit_id`
- `image_base64` or `image`
- optional `mime_type`

Backend validation orchestration:

- [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:24)

Provider integration:

- OpenAI Vision request in [backend/app/services/openai_service.py](/home/alexo/projects/streakUP/backend/app/services/openai_service.py:62)

What gets stored in `validaciones` today:

- `tipo_validacion="foto"`
- `validado=True/False`
- `evidencia` stores JSON metadata, not the raw image
- `tiempo_segundos` is unused in current photo flow

Important operational note:

- Validation availability depends on `OPENAI_API_KEY` in [backend/app/config.py](/home/alexo/projects/streakUP/backend/app/config.py:105)
- Readiness reports validation configuration but not actual provider health in [backend/app/routes/ops_routes.py](/home/alexo/projects/streakUP/backend/app/routes/ops_routes.py:19)

### 7. Frontend habit rendering

Frontend habit type contract is richer than backend reality:

- [frontend/types/habits.ts](/home/alexo/projects/streakUP/frontend/types/habits.ts:3)

Frontend expects every habit to have:

- `habit_type`
- `frequency`
- `section`
- `target_duration`
- `pomodoro_enabled`
- `target_quantity`
- `target_unit`

But connected backend supplies hardcoded defaults from `serialize_user_habit()`.

Main rendering entrypoints:

- Habit list: [frontend/app/(dashboard)/habits/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/page.tsx:12)
- Dashboard habit cards: [frontend/app/(dashboard)/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/page.tsx:202)
- Validation screen: [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:26)
- Stats page: [frontend/app/(dashboard)/stats/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/stats/page.tsx:180)
- Profile page: [frontend/app/(dashboard)/profile/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/profile/page.tsx:111)

### 8. Habit creation/editing

#### Connected create

Current connected create is assignment only:

- UI picks one catalog habit
- No custom name
- No custom target
- No evidence choice

Files:

- [frontend/app/(dashboard)/habits/new/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/new/page.tsx:13)
- [frontend/services/habits/habitService.ts](/home/alexo/projects/streakUP/frontend/services/habits/habitService.ts:37)
- [backend/app/routes/habit_routes.py](/home/alexo/projects/streakUP/backend/app/routes/habit_routes.py:87)

#### Connected edit

Not implemented:

- Backend returns `501`: [backend/app/routes/habit_routes.py](/home/alexo/projects/streakUP/backend/app/routes/habit_routes.py:119)
- Frontend service blocks editing unless offline mode is enabled: [frontend/services/habits/habitService.ts](/home/alexo/projects/streakUP/frontend/services/habits/habitService.ts:50)

#### Offline-only edit

There is a more advanced edit screen, but it only persists to local storage when explicit offline mode is enabled:

- [frontend/app/(dashboard)/habits/edit/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/edit/page.tsx:48)
- [frontend/services/storage/localData.ts](/home/alexo/projects/streakUP/frontend/services/storage/localData.ts:163)

This UI already models:

- custom name
- `habit_type`
- `frequency`
- `target_duration`
- `pomodoro_enabled`
- `target_quantity`
- `target_unit`

But none of that exists in the connected backend schema.

### 9. Backend models, schemas, migrations, seed data, and API routes

Relevant backend files inspected:

- Models:
  - [backend/app/models/habit.py](/home/alexo/projects/streakUP/backend/app/models/habit.py:1)
  - [backend/app/models/user_habit.py](/home/alexo/projects/streakUP/backend/app/models/user_habit.py:1)
  - [backend/app/models/checkin.py](/home/alexo/projects/streakUP/backend/app/models/checkin.py:1)
  - [backend/app/models/validation_log.py](/home/alexo/projects/streakUP/backend/app/models/validation_log.py:1)
  - [backend/app/models/pomodoro_session.py](/home/alexo/projects/streakUP/backend/app/models/pomodoro_session.py:1)
  - [backend/app/models/xp_log.py](/home/alexo/projects/streakUP/backend/app/models/xp_log.py:1)
- Services:
  - [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:1)
  - [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:1)
  - [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:1)
  - [backend/app/services/openai_service.py](/home/alexo/projects/streakUP/backend/app/services/openai_service.py:1)
  - [backend/app/services/pomodoro_service.py](/home/alexo/projects/streakUP/backend/app/services/pomodoro_service.py:1)
  - [backend/app/services/stats_service.py](/home/alexo/projects/streakUP/backend/app/services/stats_service.py:1)
  - [backend/app/services/xp_service.py](/home/alexo/projects/streakUP/backend/app/services/xp_service.py:1)
- Routes:
  - [backend/app/routes/habit_routes.py](/home/alexo/projects/streakUP/backend/app/routes/habit_routes.py:1)
  - [backend/app/routes/checkin_routes.py](/home/alexo/projects/streakUP/backend/app/routes/checkin_routes.py:1)
  - [backend/app/routes/validation_routes.py](/home/alexo/projects/streakUP/backend/app/routes/validation_routes.py:1)
  - [backend/app/routes/pomodoro_routes.py](/home/alexo/projects/streakUP/backend/app/routes/pomodoro_routes.py:1)
  - [backend/app/routes/stats_routes.py](/home/alexo/projects/streakUP/backend/app/routes/stats_routes.py:1)
  - [backend/app/routes/ops_routes.py](/home/alexo/projects/streakUP/backend/app/routes/ops_routes.py:1)
- Schemas:
  - [backend/app/schemas/habit_validations.py](/home/alexo/projects/streakUP/backend/app/schemas/habit_validations.py:1)
  - [backend/app/schemas/validations.py](/home/alexo/projects/streakUP/backend/app/schemas/validations.py:1)
- Migrations:
  - [backend/migrations/versions/0001_initial_baseline.py](/home/alexo/projects/streakUP/backend/migrations/versions/0001_initial_baseline.py:1)
  - [backend/migrations/versions/0002_add_pomodoro_sessions.py](/home/alexo/projects/streakUP/backend/migrations/versions/0002_add_pomodoro_sessions.py:1)
- Seed/bootstrap:
  - [backend/app/services/catalog_bootstrap_service.py](/home/alexo/projects/streakUP/backend/app/services/catalog_bootstrap_service.py:1)
  - [data/db/seed.sql](/home/alexo/projects/streakUP/data/db/seed.sql:1)
  - [backend/habits_dump.json](/home/alexo/projects/streakUP/backend/habits_dump.json:1)

## B. FEATURE-BY-FEATURE GAP ANALYSIS

### 1. Streak reset on failed validation

#### What already exists

- Failed validations can be stored in `validaciones.validado = false`
- The validate screen already displays a rejection UI: [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:321)

#### What partially exists

- Validation happens before creating a check-in in the photo flow
- So a failed photo validation does not create a new check-in for that path

#### What is missing

- No rule that a failed validation actively resets or breaks a streak
- No streak state that references validation failure
- No authoritative completion status beyond presence/absence of a `CheckIn`

#### What is incompatible

- Dashboard check-ins bypass validation entirely: [frontend/app/(dashboard)/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/page.tsx:78)
- Stats streak ignores validation failures and looks only at check-in dates: [backend/app/services/stats_service.py](/home/alexo/projects/streakUP/backend/app/services/stats_service.py:223)
- A user can get a check-in and XP without validation through `/api/checkins/toggle`

#### What would need to change

- Tables:
  - likely `registro_habitos`
  - likely `validaciones`
  - possibly new completion-state fields
- Backend:
  - [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:18)
  - [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:24)
  - [backend/app/services/stats_service.py](/home/alexo/projects/streakUP/backend/app/services/stats_service.py:34)
  - [backend/app/services/streak_service.py](/home/alexo/projects/streakUP/backend/app/services/streak_service.py:1)
- Frontend:
  - [frontend/app/(dashboard)/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/page.tsx:202)
  - possibly [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:26)

### 2. Photo / text / timer validation types

#### What already exists

- Photo validation exists end to end
- DB has `validaciones.tipo_validacion`
- DB allows values `foto`, `tiempo`, `manual`

#### What partially exists

- `tiempo` exists in DB enum and `tiempo_segundos` exists as a column
- Frontend types already mention `habit_type: "boolean" | "time" | "quantity"`

#### What is missing

- No text validation type in DB enum
- No backend validation route that accepts text evidence
- No timer validation route that turns time evidence into habit completion
- No habit-level configuration that says which evidence type is required

#### What is incompatible

- Backend validation route requires image payload: [backend/app/routes/validation_routes.py](/home/alexo/projects/streakUP/backend/app/routes/validation_routes.py:55)
- OpenAI service is image-only: [backend/app/services/openai_service.py](/home/alexo/projects/streakUP/backend/app/services/openai_service.py:62)
- Frontend validation screen is file-upload only

#### What would need to change

- Tables:
  - `habitos` and/or `habitos_usuario`
  - `validaciones`
- Backend:
  - [backend/app/routes/validation_routes.py](/home/alexo/projects/streakUP/backend/app/routes/validation_routes.py:42)
  - [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:24)
  - [backend/app/services/openai_service.py](/home/alexo/projects/streakUP/backend/app/services/openai_service.py:62)
- Frontend:
  - [frontend/types/habits.ts](/home/alexo/projects/streakUP/frontend/types/habits.ts:3)
  - [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:190)

### 3. Pomodoro / timer habit support

#### What already exists

- `pomodoro_sessions` table and model exist
- Pomodoro create/list/complete API exists
- Pomodoro UI page is implemented and working

#### What partially exists

- `pomodoro_sessions.habit_id` can reference `habitos_usuario.id`
- Backend `create_session()` validates that the referenced habit belongs to the user

#### What is missing

- No automatic habit completion from a completed timer session
- No XP award on completed timer session
- No streak change on completed timer session
- No required-duration-to-success linkage for habits

#### What is incompatible

- Pomodoro UI starts sessions without passing a habit id: [frontend/app/(dashboard)/pomodoro/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/pomodoro/page.tsx:227)
- `complete_session()` only marks the session complete: [backend/app/services/pomodoro_service.py](/home/alexo/projects/streakUP/backend/app/services/pomodoro_service.py:62)
- Stats ignore `pomodoro_sessions`

#### What would need to change

- Tables:
  - likely `habitos_usuario` for target duration and evidence type
  - maybe `validaciones` if timer completion is treated as a validation attempt
- Backend:
  - [backend/app/services/pomodoro_service.py](/home/alexo/projects/streakUP/backend/app/services/pomodoro_service.py:25)
  - [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:18)
  - [backend/app/services/stats_service.py](/home/alexo/projects/streakUP/backend/app/services/stats_service.py:34)
- Frontend:
  - [frontend/app/(dashboard)/pomodoro/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/pomodoro/page.tsx:146)
  - [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:145)

### 4. Text evidence submission + AI verification

#### What already exists

- `validaciones.evidencia TEXT` could technically store text

#### What partially exists

- The validation system already has a log table and a provider integration pattern

#### What is missing

- No text field in UI
- No backend route contract for text evidence
- No AI text validation service
- No DB enum/type for text validation
- No persistence convention for storing raw user text vs provider result

#### What is incompatible

- Validation route rejects requests without image data
- OpenAI service only sends image content blocks
- The frontend validation service only sends image data: [frontend/services/validation/validationService.ts](/home/alexo/projects/streakUP/frontend/services/validation/validationService.ts:45)

#### What would need to change

- Tables:
  - `validaciones`
  - likely `habitos_usuario`
- Backend:
  - [backend/app/routes/validation_routes.py](/home/alexo/projects/streakUP/backend/app/routes/validation_routes.py:42)
  - [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:24)
  - [backend/app/services/openai_service.py](/home/alexo/projects/streakUP/backend/app/services/openai_service.py:62)
- Frontend:
  - [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:190)
  - [frontend/services/validation/validationService.ts](/home/alexo/projects/streakUP/frontend/services/validation/validationService.ts:45)

### 5. Habit renaming by user

#### What already exists

- Offline-only edit UI allows `name` updates in local storage

#### What partially exists

- Backend has a `PUT /api/habits/:id` endpoint placeholder

#### What is missing

- No DB column for user-specific name
- No connected backend update logic
- No serializer support for custom names

#### What is incompatible

- Current displayed name always comes from catalog `Habit.nombre`: [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:80)
- Updating `habitos.nombre` would incorrectly rename the catalog for every user

#### What would need to change

- Table:
  - `habitos_usuario`
- Backend:
  - [backend/app/models/user_habit.py](/home/alexo/projects/streakUP/backend/app/models/user_habit.py:15)
  - [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:70)
  - [backend/app/routes/habit_routes.py](/home/alexo/projects/streakUP/backend/app/routes/habit_routes.py:119)
- Frontend:
  - [frontend/app/(dashboard)/habits/edit/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/edit/page.tsx:117)

### 6. User-defined quantities / targets

#### What already exists

- Frontend offline edit UI already models:
  - `target_duration`
  - `target_quantity`
  - `target_unit`
  - `pomodoro_enabled`

#### What partially exists

- Some catalog names imply targets in natural language:
  - `Beber 2L de agua`
  - `Ejercicio 30 min`
  - `Trabajo profundo 60 min`
  - `Leer 20 min`

#### What is missing

- No connected persistence
- No backend validation of these fields in active routes
- No completion semantics for quantity/time targets

#### What is incompatible

- Backend serializer always returns null/false for target fields
- Check-ins are binary toggles with no amount or duration payload

#### What would need to change

- Table:
  - likely `habitos_usuario`
- Backend:
  - [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:70)
  - [backend/app/routes/habit_routes.py](/home/alexo/projects/streakUP/backend/app/routes/habit_routes.py:119)
  - [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:18)
- Frontend:
  - [frontend/types/habits.ts](/home/alexo/projects/streakUP/frontend/types/habits.ts:3)
  - [frontend/app/(dashboard)/habits/edit/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/edit/page.tsx:244)

### 7. Rich habit detail

#### What already exists

- Catalog description exists
- Difficulty exists
- Base XP exists

#### What partially exists

- Frontend shape already anticipates richer detail
- Offline-only edit UI shows a future direction

#### What is missing

- evidence type
- validation type
- target time
- target quantity
- target unit
- effective frequency on backend
- user-level detail override

#### What is incompatible

- Current backend habit model is still simple title/category/difficulty/xp
- Current user-habit model is still only an assignment

#### What would need to change

- Tables:
  - `habitos`
  - `habitos_usuario`
- Backend:
  - [backend/app/models/habit.py](/home/alexo/projects/streakUP/backend/app/models/habit.py:21)
  - [backend/app/models/user_habit.py](/home/alexo/projects/streakUP/backend/app/models/user_habit.py:15)
  - [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:70)
- Frontend:
  - [frontend/types/habits.ts](/home/alexo/projects/streakUP/frontend/types/habits.ts:3)

### 8. Achievement / badge / XP extensibility

#### What already exists

- XP totals and level data exist
- XP logs exist
- `niveles` table exists
- Profile UI already computes achievements from current stats

#### What partially exists

- `niveles.recompensa` suggests future badge/reward usage
- Profile page has achievement definitions and unlock conditions

#### What is missing

- No achievement table
- No badge table
- No milestone record table
- No persistent unlock history
- No backend API for achievements
- No XP reason types beyond check-in/undo/validation

#### What is incompatible

- Current achievements are frontend-only derived state: [frontend/app/(dashboard)/profile/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/profile/page.tsx:52)
- `niveles` is not consulted by runtime XP logic

#### What would need to change

- Tables:
  - likely new `achievements`, `user_achievements`, or milestone tables
  - maybe extend `xp_logs`
- Backend:
  - [backend/app/services/xp_service.py](/home/alexo/projects/streakUP/backend/app/services/xp_service.py:87)
  - [backend/app/services/stats_service.py](/home/alexo/projects/streakUP/backend/app/services/stats_service.py:84)
- Frontend:
  - [frontend/app/(dashboard)/profile/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/profile/page.tsx:111)

## C. DATABASE / DATA MODEL REVIEW

### Current tables and columns

#### `users`

- `id`
- `username`
- `email`
- `password_hash`
- `role`
- `total_xp`
- `level`
- `xp_in_level`
- `created_at`
- `updated_at`

Source:

- [backend/migrations/versions/0001_initial_baseline.py](/home/alexo/projects/streakUP/backend/migrations/versions/0001_initial_baseline.py:19)

#### `categorias`

- `id`
- `nombre`
- `descripcion`

#### `habitos`

- `id`
- `categoria_id`
- `nombre`
- `descripcion`
- `dificultad`
- `xp_base`

#### `habitos_usuario`

- `id`
- `usuario_id`
- `habito_id`
- `fecha_inicio`
- `fecha_fin`
- `activo`
- `fecha_creacion`

#### `registro_habitos`

- `id`
- `habitousuario_id`
- `fecha`
- `completado`
- `xp_ganado`

#### `validaciones`

- `id`
- `habitousuario_id`
- `tipo_validacion`
- `evidencia`
- `tiempo_segundos`
- `validado`
- `fecha`

#### `xp_logs`

- `id`
- `usuario_id`
- `cantidad`
- `fuente`
- `fecha`

#### `pomodoro_sessions`

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

#### `niveles`

- `id`
- `nombre`
- `xp_minimo`
- `xp_maximo`
- `recompensa`
- `descripcion`

### Answers to the requested DB questions

#### Do current tables support multiple evidence types?

Partially.

Facts:

- `validaciones.tipo_validacion` supports `foto`, `tiempo`, `manual`
- There is no `texto`
- There is no habit-level column saying which evidence type a habit requires

Conclusion:

- The log table can distinguish some attempt types
- The actual habit system does not support multiple evidence types end to end

#### Is there already a place to store text evidence?

Not explicitly.

Fact:

- `validaciones.evidencia TEXT` exists

Inference:

- It could be reused to store submitted text, but current implementation uses it for photo-validation metadata JSON, so text evidence is not modeled cleanly yet

#### Is there already a place to store timer/time-duration evidence?

Partially.

Facts:

- `validaciones.tiempo_segundos` exists
- `pomodoro_sessions` stores session durations and completion times

But:

- Neither currently feeds habit completion logic

#### Is there already a distinction between base habit definition and user-specific habit configuration?

There is a distinction between base habit definition and user assignment, but not user-specific configuration.

Facts:

- Base habit definition: `habitos`
- User assignment: `habitos_usuario`

Missing:

- per-user custom configuration fields

#### Can user-specific custom names and custom targets be added cleanly?

Yes, but only after schema changes.

Best fit in the current model:

- extend `habitos_usuario`

Why:

- `habitos` is shared catalog data
- mutating `habitos` would affect all users

#### Can streak failures and rejected validations be represented cleanly?

Not cleanly today.

Facts:

- Rejected validation attempts can be logged
- There is no authoritative completion-state model that stats use

Conclusion:

- The repo can record failure attempts, but it cannot cleanly represent “this failure resets streak” with current logic

#### Is there already support for achievements or milestone records?

No.

Facts:

- No achievement table
- No milestone table
- No user badge table
- `niveles` exists but is unused by runtime feature logic

#### Are there schema inconsistencies between DB, backend models, seed.sql, and frontend expectations?

Yes.

Main inconsistency:

- Frontend expects rich habit metadata
- Backend DB/models do not have it

Examples:

- Frontend `Habit` type has `habit_type`, `frequency`, `target_duration`, `target_quantity`, `target_unit`, `pomodoro_enabled`: [frontend/types/habits.ts](/home/alexo/projects/streakUP/frontend/types/habits.ts:3)
- Backend serializer hardcodes those values: [backend/app/services/habit_service.py](/home/alexo/projects/streakUP/backend/app/services/habit_service.py:76)

Additional inconsistency:

- Stale backend validation test scripts instantiate `Habit` with fields that do not exist in the current model:
  - [backend/tests/test_validation_500.py](/home/alexo/projects/streakUP/backend/tests/test_validation_500.py:38)
  - [backend/test_validation_500.py](/home/alexo/projects/streakUP/backend/test_validation_500.py:68)

### Exact columns likely needed for this phase

Most likely additions to `habitos_usuario`:

- `custom_name`
- `custom_description` or `description_override`
- `evidence_type` or `validation_type`
- `target_value`
- `target_unit`
- `target_duration_minutes`
- `frequency`
- `pomodoro_enabled`

Most likely additions/changes to `validaciones`:

- support for `texto` in `tipo_validacion`
- explicit structured field for text evidence, or a clear convention for `evidencia`
- possibly a stronger result/status field than only `validado bool`

Likely completion-related change:

- a field or model that distinguishes:
  - pending
  - validated
  - rejected
  - manually completed

This is not present today.

## D. API / BACKEND LOGIC REVIEW

### How is a habit completion/check-in currently created?

Two paths:

#### Path 1: manual dashboard toggle

- `POST /api/checkins/toggle`
- [backend/app/routes/checkin_routes.py](/home/alexo/projects/streakUP/backend/app/routes/checkin_routes.py:19)
- implementation: [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:18)

Behavior:

- creates/deletes a `CheckIn`
- awards/revokes XP immediately

#### Path 2: successful photo validation

- `POST /api/habits/validate`
- [backend/app/routes/validation_routes.py](/home/alexo/projects/streakUP/backend/app/routes/validation_routes.py:42)
- implementation: [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:24)

Behavior:

- calls AI
- if valid:
  - creates `CheckIn` if none exists
  - or upgrades XP on existing same-day check-in

### Where is AI validation triggered?

- In `validate_habit()` by calling `analyze_habit_image()`
- [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:48)

### What payload is currently sent for validation?

Frontend sends:

```json
{
  "habit_id": 3,
  "image_base64": "image-base64",
  "mime_type": "image/png"
}
```

Source:

- [frontend/services/validation/validationService.ts](/home/alexo/projects/streakUP/frontend/services/validation/validationService.ts:45)
- corresponding frontend test: [frontend/tests/unit/validation-service.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/validation-service.test.ts:149)

### Is the system designed only for images right now, or can it already support text/timer with minimal changes?

It is designed only for images right now.

Facts:

- Route requires image payload
- Provider service constructs an image prompt
- Validation screen is image-only
- Manual check-ins bypass validation for all habits

Timer is not minimal-change because:

- timer sessions are not connected to completion logic

Text is not minimal-change because:

- no route contract
- no AI text evaluator
- no frontend input
- no DB enum value

### Where would `validation_type` best be introduced?

Best fit based on current repo shape:

- as habit configuration, likely on `habitos_usuario`
- optionally with catalog defaults on `habitos`

Reason:

- validation type is a property of how a user completes a habit
- not just a property of an individual validation attempt

Today `validaciones.tipo_validacion` only describes the attempt log. It does not configure habit behavior.

### Where should rejected validation break a streak?

Not in the route layer and not only in the frontend.

Best backend insertion point:

- a real completion/streak domain flow, currently missing from [backend/app/services/streak_service.py](/home/alexo/projects/streakUP/backend/app/services/streak_service.py:1)

Given current code, changes would need to be coordinated in:

- [backend/app/services/checkin_service.py](/home/alexo/projects/streakUP/backend/app/services/checkin_service.py:18)
- [backend/app/services/validation_service.py](/home/alexo/projects/streakUP/backend/app/services/validation_service.py:24)
- [backend/app/services/stats_service.py](/home/alexo/projects/streakUP/backend/app/services/stats_service.py:34)

### Is XP awarded before or after validation?

Depends on path:

- Manual dashboard path: before validation, because there is no validation in that path
- Photo validation path: after successful validation

This is a core incompatibility with strict validation.

### Are there race conditions or logic bugs that would make strict validation unreliable?

Yes.

#### 1. Manual bypass

The user can complete habits through `/api/checkins/toggle` without any validation.

#### 2. Duplicate streak logic

Stats streak and validation response streak use different algorithms and scopes.

#### 3. Validation uniqueness is app-level, not DB-level

Fact:

- `validate_habit()` checks for an existing validation for today using a query
- There is no DB uniqueness constraint for one validation per day per user-habit

Inference:

- Concurrent requests could create duplicate same-day validations

#### 4. Check-in presence is treated as final truth

Failed validations are logged but do not affect stats if a check-in exists through another path.

## E. FRONTEND / UX REVIEW

### Habit list

- [frontend/app/(dashboard)/habits/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/page.tsx:12)

Current behavior:

- Lists active habits
- Shows validate camera action for every habit
- Shows edit action only in offline mode
- Shows delete action

### Habit cards on dashboard

- [frontend/app/(dashboard)/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/page.tsx:202)

Current behavior:

- Cards are clickable
- Clicking toggles the completion state directly
- No habit-type-specific input is shown

This is the current main UX blocker for strict validation.

### Validation flow

- [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:26)

Current behavior:

- Loads the habit by id
- Shows static copy: “Sube una foto como evidencia”
- Accepts only image file input
- Calls photo validation service
- On success refreshes today habits and stats in background
- On failure shows rejection or transport error

### Check-in submission

- Service: [frontend/services/checkins/checkinService.ts](/home/alexo/projects/streakUP/frontend/services/checkins/checkinService.ts:28)
- UI caller: [frontend/app/(dashboard)/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/page.tsx:78)

Current behavior:

- Sends only `habit_id` and optional `date`
- No amount
- No duration
- No text evidence

### Habit creation/editing

#### Creation

- [frontend/app/(dashboard)/habits/new/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/new/page.tsx:13)

Current behavior:

- Catalog picker only

#### Editing

- [frontend/app/(dashboard)/habits/edit/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/edit/page.tsx:48)

Current behavior:

- Rich edit form exists
- Connected mode intentionally blocked
- Offline only

### Stats display

- [frontend/app/(dashboard)/stats/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/stats/page.tsx:180)

Displays:

- streak
- completion rate
- total completed
- weekly history
- per-habit breakdown
- 30-day heatmap
- personal records

All of this depends on backend detailed stats.

### Streak display

- Dashboard summary card: [frontend/app/(dashboard)/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/page.tsx:157)
- Stats page summary and records: [frontend/app/(dashboard)/stats/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/stats/page.tsx:272)
- Profile page: [frontend/app/(dashboard)/profile/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/profile/page.tsx:245)

### XP display

- Stats summary endpoint includes XP/level
- Profile page shows XP totals and progress bar
- Backend XP endpoint: [backend/app/routes/stats_routes.py](/home/alexo/projects/streakUP/backend/app/routes/stats_routes.py:27)

### Answers to the requested frontend questions

#### Is the current UI hardcoded for photo validation?

Yes.

#### Can the current frontend dynamically render different validation inputs based on habit type?

Not currently.

Reason:

- The validate page only renders image upload UI
- `habit_type` is only displayed as a label

#### Is there already a timer component or something reusable?

Yes.

- The Pomodoro page contains a full timer implementation and recent session handling
- [frontend/app/(dashboard)/pomodoro/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/pomodoro/page.tsx:146)

#### Is there a current form that could be extended for text evidence?

Yes.

Best extension point:

- [frontend/app/(dashboard)/habits/validate/page.tsx](/home/alexo/projects/streakUP/frontend/app/(dashboard)/habits/validate/page.tsx:145)

Reason:

- It is already the dedicated evidence-submission page

#### Is there support for editing habit metadata or only selecting habits?

- Connected mode: only selecting habits
- Offline mode: richer metadata editing exists locally only

#### What would be the smallest clean frontend path to support photo/text/timer habits?

Smallest clean path based on current repo:

1. Stop treating dashboard card click as universal completion
2. Let dashboard route habits into a dedicated completion/validation experience
3. Extend the existing validate page to branch by effective evidence type
4. Reuse the pomodoro timer flow for timer evidence instead of inventing a second timer UI

## F. SEED / TEST / SAMPLE DATA REVIEW

### Seed direction

Current catalog seed does not model the future product explicitly, but it does hint at it through names.

Examples from [data/db/seed.sql](/home/alexo/projects/streakUP/data/db/seed.sql:13):

- `Beber 2L de agua`
- `Ejercicio 30 min`
- `Trabajo profundo 60 min`
- `Leer 20 min`

These imply:

- quantity target
- time target

But the system stores them only as names, not structured fields.

### Do current seeds imply different evidence types?

Not explicitly.

Inference:

- `Trabajo profundo 60 min` and `Leer 20 min` are strong candidates for timer/text support
- `Beber 2L de agua` looks like quantity tracking

But the repo does not currently encode those distinctions anywhere.

### Test coverage currently present

Backend tests inspected:

- [backend/tests/test_xp_consistency.py](/home/alexo/projects/streakUP/backend/tests/test_xp_consistency.py:1)
- [backend/tests/test_operational_readiness.py](/home/alexo/projects/streakUP/backend/tests/test_operational_readiness.py:1)
- [backend/tests/test_auth_flow.py](/home/alexo/projects/streakUP/backend/tests/test_auth_flow.py:1)
- [backend/tests/test_migration_readiness.py](/home/alexo/projects/streakUP/backend/tests/test_migration_readiness.py:1)
- [backend/tests/test_validation_500.py](/home/alexo/projects/streakUP/backend/tests/test_validation_500.py:1)

Frontend tests inspected:

- [frontend/tests/unit/validation-service.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/validation-service.test.ts:1)
- [frontend/tests/unit/habit-service.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/habit-service.test.ts:1)
- [frontend/tests/unit/connected-mode-services.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/connected-mode-services.test.ts:1)
- [frontend/tests/unit/stats-view-state.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/stats-view-state.test.ts:1)

### Validation from this recon pass

Backend relevant suite executed successfully via `unittest` from `backend/`:

- `tests.test_xp_consistency`
- `tests.test_operational_readiness`
- `tests.test_auth_flow`
- `tests.test_migration_readiness`

Result:

- 27 tests ran
- all passed

Frontend relevant unit run:

- `connected-mode-services.test.ts`: passed
- `habit-service.test.ts`: passed
- `stats-view-state.test.ts`: passed
- `validation-service.test.ts`: failed

Important current mismatch:

- Test expects `/No se pudo contactar el servicio de validación/`
- Service currently returns `"Error de red o CORS: No se pudo conectar con el servidor..."`

Files:

- expectation: [frontend/tests/unit/validation-service.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/validation-service.test.ts:138)
- implementation: [frontend/services/validation/validationService.ts](/home/alexo/projects/streakUP/frontend/services/validation/validationService.ts:30)

### Would current tests break if we introduce `validation_type`, `target_time`, `custom_name`, `target_value`, etc.?

Yes, some will.

Most obvious ones:

- [backend/tests/test_auth_flow.py](/home/alexo/projects/streakUP/backend/tests/test_auth_flow.py:237) expects update route `501`
- [frontend/tests/unit/habit-service.test.ts](/home/alexo/projects/streakUP/frontend/tests/unit/habit-service.test.ts:19) expects connected edit rejection
- [backend/tests/test_xp_consistency.py](/home/alexo/projects/streakUP/backend/tests/test_xp_consistency.py:81) codifies current photo-bonus XP logic

### What new fixtures/tests would be needed later

- text evidence success/failure
- timer completion success/failure
- rejected validation resets streak
- no accidental XP before strict validation
- custom name persists per user without mutating catalog
- target value/unit persistence
- mixed habit types in stats
- achievement unlock persistence and replay behavior

## G. RISKS / BLOCKERS

### 1. Backend/frontend mismatch

The frontend already models richer habit fields that the backend does not persist.

Risk:

- adding more UI on top of current connected API will increase drift and false assumptions

### 2. DB migration risk

The data model split is currently:

- shared catalog
- assignment-only user habit

Risk:

- adding user customization to the wrong table will couple user data to catalog data

### 3. Stats/streak inconsistencies

Streak logic is duplicated and inconsistent.

Risk:

- one screen can show a different streak from another flow

### 4. AI validation assumptions are image-only

OpenAI integration is hardcoded around image inputs.

Risk:

- text/timer support cannot be added safely as small route-only tweaks

### 5. Fragile XP semantics for strict validation

Current XP semantics assume:

- manual check-in is always allowed
- photo validation is a bonus/upgrade

Risk:

- if validation becomes authoritative, XP timing must shift with it

### 6. Duplicate sources of truth

Current truth is split across:

- `CheckIn`
- `ValidationLog`
- `PomodoroSession`
- frontend local storage in offline mode

Risk:

- future features will become inconsistent unless one authoritative completion model is chosen

### 7. Current check-in flow can bypass all strictness

This is the most immediate blocker for strict validation.

### 8. Stale tests/scripts around validation area

Files:

- [backend/tests/test_validation_500.py](/home/alexo/projects/streakUP/backend/tests/test_validation_500.py:1)
- [backend/test_validation_500.py](/home/alexo/projects/streakUP/backend/test_validation_500.py:1)

Risk:

- they reflect older assumptions and can confuse future work in this area

## H. RECOMMENDED IMPLEMENTATION ORDER

### 1. Schema/model groundwork

- Extend the persisted habit model so the backend can represent:
  - effective evidence type
  - custom name
  - target quantity
  - target unit
  - target duration
  - frequency if needed
- Best fit in current repo: add user-specific config to `habitos_usuario`
- Optionally add catalog defaults to `habitos`

### 2. Backend payload and serializer support

- Update `serialize_user_habit()` so connected frontend receives real metadata instead of hardcoded placeholders
- Add connected update support for user habit customization

### 3. Unified completion / validation domain logic

- Move streak/completion authority out of ad hoc stats and validation helpers
- Implement actual logic in `streak_service.py` or equivalent central service
- Ensure stats and validation responses use the same rule set

### 4. Frontend dynamic validation UI

- Convert the existing validate screen into an evidence-type-aware screen
- Keep it as the single evidence-submission entrypoint

### 5. Strict streak logic

- Once completion truth is centralized, enforce:
  - failed validation does not count
  - rejected validation can break/reset streak as product requires
- Remove or restrict direct dashboard toggle for habits that require evidence

### 6. Timer/text support

- Add text evidence input and AI text validation
- Connect completed pomodoro/time sessions into the same completion flow

### 7. Achievement groundwork

- Only after streak/XP/completion semantics are stable
- Add backend-persisted achievement/milestone structures

## I. FINAL VERDICT

### What is already ready?

- Catalog habit assignment and deactivation
- Photo-validation infrastructure
- XP totals/logs and levels
- Stats endpoints over current check-in model
- Standalone pomodoro session infrastructure

### What is closest to ready?

- Timer support foundation
- Frontend rich habit configuration UI
- Validation logging structure

These are closest because partial code and tables already exist.

### What must be redesigned?

- Completion/streak source of truth
- The relationship between:
  - validation attempts
  - actual habit completion
  - XP award timing
- User-specific habit configuration storage

### What should we implement first?

- schema/model groundwork for user-specific habit configuration
- then unified backend completion/validation logic

### What can wait until Sprint 6?

- persisted achievements
- badges
- milestone history
- deeper XP reward system expansion beyond the current XP/level fields

## Point B Readiness Summary

- `Strict streak reset on failed validation`: not ready
- `Photo validation`: partially ready
- `Text validation`: not ready
- `Timer/pomodoro as habit evidence`: partial foundation only
- `User habit renaming`: offline-only, not ready in connected mode
- `User-defined quantities/targets`: frontend-only, not ready in connected mode
- `Rich habit metadata`: frontend shape exists, backend persistence missing
- `Achievements/badges/XP extensibility`: partial foundation, no persisted achievement system
