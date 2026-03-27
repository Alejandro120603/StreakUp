You are now moving from architecture design to implementation.

Project: StreakUP

Goal:
Create the frontend project structure described in the architecture report.

Tech stack:
- Node.js
- Next.js (App Router)
- React
- TypeScript

The project folder must be:

frontend/

You must implement the **project scaffold only**, following the architecture that was previously defined.

Do NOT implement full application logic yet.

Only create the base structure, base files, and minimal scaffolding needed for the project to run.

----------------------------------------

STEP 1 — Create Next.js project

Initialize a Next.js project with:

- App Router
- TypeScript
- ESLint enabled
- src directory disabled
- Tailwind optional (do not include unless necessary)

The project must live inside:

frontend/

----------------------------------------

STEP 2 — Create the folder architecture

Implement the following folder structure exactly:

frontend/
├─ app/
├─ components/
│  ├─ ui/
│  ├─ forms/
│  ├─ layout/
│  └─ feedback/
├─ features/
│  ├─ auth/
│  ├─ habits/
│  ├─ streaks/
│  ├─ challenges/
│  ├─ rewards/
│  └─ admin/
├─ hooks/
├─ services/
│  ├─ api/
│  ├─ auth/
│  └─ telemetry/
├─ state/
├─ providers/
├─ lib/
├─ utils/
├─ types/
├─ styles/
│  └─ themes/
├─ config/
├─ constants/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
├─ public/
└─ middleware.ts

Create placeholder files where appropriate.

----------------------------------------

STEP 3 — App Router base

Inside app/ implement minimal routes:

app/
  layout.tsx
  page.tsx
  globals.css

Also implement route groups:

app/(mobile)/
app/(admin)/admin/

Each group must include:

layout.tsx
page.tsx

----------------------------------------

STEP 4 — Providers

Create:

providers/
  AppProviders.tsx

This file should prepare the root provider composition placeholder for:

- state
- auth
- future query client
- theme

----------------------------------------

STEP 5 — API Layer

Create:

services/api/client.ts

This should export a basic HTTP wrapper that will later connect to the Flask backend.

Also create:

services/api/endpoints.ts

----------------------------------------

STEP 6 — Types

Create basic shared types:

types/api.ts
types/auth.ts
types/habits.ts
types/common.ts

----------------------------------------

STEP 7 — State

Create a minimal global state scaffold:

state/store.ts
state/app.slice.ts

Do not implement business logic yet.

----------------------------------------

STEP 8 — Config

Create:

config/app.config.ts
config/routes.ts
config/navigation.ts

----------------------------------------

STEP 9 — Constants

Create:

constants/query-keys.ts
constants/roles.ts
constants/limits.ts

----------------------------------------

STEP 10 — Environment

Create:

.env.example

Include:

NEXT_PUBLIC_API_URL=

----------------------------------------

Important rules

Do NOT:
- Implement business logic
- Implement full UI
- Add heavy libraries

DO:
- Create a clean scaffold
- Use TypeScript everywhere
- Ensure the project runs with `npm run dev`

----------------------------------------

Output

1. Show the created folder tree
2. Show the main files created
3. Confirm the project runs successfully