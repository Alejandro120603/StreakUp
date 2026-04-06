# StreakUP

StreakUP es una plataforma para **gestión de hábitos, rachas y progreso personal** con soporte **offline-first**, sincronización con backend y sistema de puntuación gamificado.

El proyecto está diseñado con una arquitectura moderna separando **Frontend (app)** y **Backend (API)**.

# Arquitectura del sistema

StreakUP utiliza una arquitectura **cliente-servidor con soporte offline**.

App móvil (Next.js + Capacitor)
├─ SQLite local (offline)
├─ UI / estado del usuario
└─ Motor de sincronización
↓
API Backend (Flask)
├─ Autenticación
├─ Lógica de negocio
└─ Base de datos (SQLite → PostgreSQL)

Esto permite:

- uso **offline**
- sincronización eficiente
- backend escalable
- separación clara de responsabilidades

# Stack Tecnológico

## Backend (API)

Backend desarrollado en **Python con Flask**.

| Tecnología | Uso |
|---|---|
| Python 3.11 | Lógica del sistema |
| Flask | API REST |
| SQLAlchemy | ORM para modelos |
| Flask-JWT-Extended | Autenticación JWT |
| SQLite | Base de datos para MVP |
| Flask-Migrate | Migraciones de base de datos |

### Futuro

- PostgreSQL
- módulo de IA para recomendaciones
- análisis de hábitos

## Frontend (App)

Aplicación móvil basada en **Next.js + Capacitor**.

| Tecnología | Uso |
|---|---|
| Node.js | entorno de desarrollo |
| Next.js | interfaz principal |
| Capacitor | empaquetado móvil |
| SQLite local | almacenamiento offline |
| Sync Engine | sincronización con backend |

# Estructura del proyecto

streakUP

backend/ → API Flask
db/ → estructura SQL de la base de datos
data/ → base de datos local y backups
Codex/ → artefactos generados por IA
Makefile → comandos de desarrollo
README.md

# Backend

backend/
│
├── app
│ ├── middleware
│ ├── models
│ ├── routes
│ ├── schemas
│ ├── services
│ ├── utils
│ ├── config.py
│ └── extensions.py
│
├── migrations
├── tests
├── run.py
└── requirements.txt

# Arquitectura del backend

El backend sigue una arquitectura **Service Layer**.

Flujo de una petición:

Request
↓
Routes (API endpoints)
↓
Services (lógica de negocio)
↓
Models (acceso a base de datos)
↓
Database

# Componentes del backend

## Models

Representan las **tablas de la base de datos**.

Ejemplos:

- `user.py` → usuarios
- `habit.py` → hábitos
- `user_habit.py` → hábitos asignados a usuarios
- `checkin.py` → registros de hábitos completados
- `xp_log.py` → historial de puntos

## Routes

Definen los **endpoints de la API REST**.

Ejemplos:

- `auth_routes.py`
- `user_routes.py`
- `habit_routes.py`
- `checkin_routes.py`
- `sync_routes.py`

## Services

Contienen **la lógica de negocio del sistema**.

Ejemplos:

- `auth_service.py`
- `difficulty_service.py`
- `streak_service.py`
- `xp_service.py`
- `sync_service.py`

## Middleware

Controla permisos y reglas antes de ejecutar rutas.

Ejemplo:

- `permissions.py`

## Schemas

Validación de datos entrantes.

Ejemplo:

- `validations.py`

## Utils

Funciones auxiliares.

Ejemplos:

- manejo de errores
- helpers reutilizables

# Base de datos

La base de datos se define en:

db/
├── schema.sql
└── seed.sql

- `schema.sql` → estructura de tablas
- `seed.sql` → datos iniciales para desarrollo

La base generada localmente se guarda en:


data/app.db

# Comandos de desarrollo

El proyecto incluye un **Makefile** para simplificar tareas.

### Crear / reiniciar base de datos

make db-init

### Crear / reiniciar base de datos con usuarios demo locales

make db-init-demo

### Abrir consola SQLite

make db-open

### Limpiar base de datos local

make db-clean

### Crear backup

make db-backup

# Hosted deployment

Para un despliegue MVP hosteado en una sola instancia con SQLite persistente:

1. Ejecuta migraciones:

   `cd backend && ./.venv/bin/flask --app run.py db upgrade`

2. Ejecuta bootstrap idempotente del catálogo:

   `cd backend && ./.venv/bin/flask --app run.py seed-catalog`

3. Inicia el backend con Gunicorn usando el puerto del entorno:

   `cd backend && PORT=8000 ./.venv/bin/gunicorn --bind 0.0.0.0:$PORT run:app`

Endpoints operativos mínimos:

- `GET /healthz`
- `GET /readyz`

`/readyz` solo responde `200` cuando la base está accesible y el catálogo requerido ya fue cargado.

# Frontend hosteado y APK

Build web contra backend hosteado:

`cd frontend && NEXT_PUBLIC_API_URL=https://api.example.com NEXT_PUBLIC_OFFLINE_MODE=false npm run build`

Build móvil exportado para Capacitor:

`cd frontend && NEXT_PUBLIC_API_URL=https://api.example.com NEXT_PUBLIC_OFFLINE_MODE=false npm run build:mobile`

Sincronizar Android con el export:

`cd frontend && npx cap sync android`

Generar APK debug:

`cd android && GRADLE_USER_HOME=/tmp/streakup-gradle ./gradlew assembleDebug`

Variables mínimas para un deploy conectado:

- Backend:
  - `SECRET_KEY`
  - `JWT_SECRET_KEY`
  - `DATABASE_URL`
  - `PORT`
  - `OPENAI_API_KEY` solo si quieres validación por foto
- Frontend:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_OFFLINE_MODE=false`

En modo conectado, el frontend ya no inventa respuestas locales cuando el backend falla. El modo offline solo se activa de forma explícita con `NEXT_PUBLIC_OFFLINE_MODE=true`.

# Sistema de módulos

El backend se organiza en módulos funcionales.

## Autenticación

Responsable de la identidad del usuario.

Funciones:

- registro
- login
- roles (`user`, `creator`, `admin`)
- gestión de perfil

## Hábitos

Gestión de hábitos del usuario.

Funciones:

- crear hábitos
- editar hábitos
- definir frecuencia
- pausar hábitos

## Retos

Sistema de desafíos basados en hábitos.

Funciones:

- plantillas de hábitos
- duración de retos
- reglas de participación

## Grupos

Sistema social.

Funciones:

- gestión de miembros
- visibilidad
- rachas grupales

## Rachas

Cálculo de consistencia.

Funciones:

- rachas individuales
- rachas grupales
- racha máxima
- reglas de conteo

## Puntuación

Sistema de progreso gamificado.

Funciones:

- puntos por hábitos
- puntos por rachas
- historial de puntos
- bonus especiales

## Ajustes

Configuración personal del usuario.

Funciones:

- perfil
- zona horaria
- privacidad
- preferencias

## Ayuda

Sistema de soporte.

Funciones:

- guías
- FAQs
- contacto

## Administración

Panel de control del sistema.

Funciones:

- gestión de usuarios
- roles
- moderación
- métricas

# Roadmap

Futuras mejoras del sistema:

- migración a PostgreSQL
- módulo de IA para recomendaciones
- sistema de notificaciones
- analytics de hábitos
- ranking de usuarios

# Licencia

Proyecto en desarrollo.
