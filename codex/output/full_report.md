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
