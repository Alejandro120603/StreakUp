# StreakUp — Changelog & Guía de Migración a Supabase

> **Fecha:** 29 de Abril de 2026  
> **Autor:** Gustavo (con ayuda de IA)  
> **Propósito:** Documentar todos los cambios recientes de la sesión para que cualquier integrante del equipo pueda retomar el trabajo sin fricción.

---

## 1. Resumen Ejecutivo de Cambios

Esta sesión tuvo **dos grandes focos**:

1. **Finalización de la Fase 1** del plan de desarrollo (Logros, Pomodoro, Eliminación de cuenta).
2. **Migración completa de la base de datos** de Render (caducado) a **Supabase (PostgreSQL)**.

---

## 2. Cambios de Código Realizados

### 2.1 Frontend

| Archivo | Cambio |
|---|---|
| `frontend/.env.local` | Apunta ahora a `http://localhost:5000` (backend local) en lugar del backend de Render |
| `frontend/app/(dashboard)/profile/page.tsx` | Corregido bug `ACHIEVEMENTS is not defined` → reemplazado por `achievements.length` (estado React real) |
| `frontend/app/(dashboard)/layout.tsx` | Registrado el componente `AchievementToast` global para notificaciones |
| `frontend/app/(dashboard)/page.tsx` | Conectado el flujo de check-in con el sistema de logros (toast al desbloquear) |
| `frontend/app/(dashboard)/pomodoro/page.tsx` | Animaciones de temas reescritas (Fuego, Vela, Hielo, Reloj) con pausa inteligente y pantalla de celebración final |
| `frontend/services/achievements/achievementService.ts` | Nuevo servicio para consumir el endpoint `/api/achievements` |
| `frontend/components/feedback/AchievementToast.tsx` | Nuevo componente toast premium animado (slide-in + barra de progreso 4s) |
| `frontend/services/auth/accountService.ts` | Nuevo servicio para la eliminación de cuenta |
| `frontend/components/feedback/ConfirmDeleteAccountModal.tsx` | Modal de confirmación de borrado de cuenta (requiere escribir "ELIMINAR") |

### 2.2 Backend

| Archivo | Cambio |
|---|---|
| `backend/.env` | `DATABASE_URL` actualizado a Supabase |
| `backend/.env.local` | `DATABASE_URL` actualizado a Supabase |
| `backend/migrations/versions/0004_make_progress_validation_driven.py` | Corregido `validado = 1` → `validado = true` para compatibilidad con PostgreSQL estricto |
| `backend/migrations/versions/e60103f7d644_add_achievements_tables.py` | *Nota: este archivo solo borraba la tabla `niveles`. Las tablas reales de logros las crea la migración siguiente.* |
| `backend/migrations/versions/c3db1f1fdb1f_add_missing_achievements_tables.py` | **Nueva migración generada** que crea formalmente las tablas `achievements` y `user_achievements` en Supabase |
| `backend/app/routes/achievement_routes.py` | Endpoint `GET /api/achievements` que devuelve catálogo + estado `earned` por usuario |
| `backend/app/routes/user_routes.py` | Endpoint `DELETE /api/users/me` con borrado en cascada de todos los datos del usuario |
| `backend/app/services/achievement_service.py` | Lógica de evaluación y otorgamiento de logros; `seed_achievements()` para poblar el catálogo |

---

## 3. Migración a Supabase

### 3.1 ¿Por qué se migró?

La base de datos gratuita de **Render caducó** y dejó de responder. Se migró a **Supabase**, que ofrece PostgreSQL gestionado con un plan gratuito estable.

### 3.2 Datos de Conexión

> ⚠️ **IMPORTANTE:** No compartas este archivo fuera del equipo.

```
Host:     db.kayskvijsjdpmugbhrzc.supabase.co
Puerto:   5432
Base:     postgres
Usuario:  postgres
Password: Samanya040529
```

**Connection String completa (para `DATABASE_URL`):**
```
postgresql://postgres:Samanya040529@db.kayskvijsjdpmugbhrzc.supabase.co:5432/postgres
```

### 3.3 Panel de Administración

Puedes ver las tablas y datos directamente en:  
👉 **https://supabase.com/dashboard** → Inicia sesión con la cuenta del equipo → Proyecto `StreakUp`.

---

## 4. Cómo Configurar tu Entorno Local

Sigue estos pasos **en orden** para tener el proyecto corriendo en tu máquina.

### Paso 1: Clonar el repositorio (si no lo tienes)

```bash
git clone <URL_DEL_REPO>
cd StreakUp
```

### Paso 2: Configurar las variables de entorno del Backend

Crea o edita el archivo `backend/.env` con el siguiente contenido:

```env
FLASK_ENV=development
SECRET_KEY=streakup_dev_secret_key_2026_super_safe_123
JWT_SECRET_KEY=streakup_jwt_secret_key_2026_super_safe_456
PORT=5000
CORS_ALLOWED_ORIGINS=*
DATABASE_URL=postgresql://postgres:Samanya040529@db.kayskvijsjdpmugbhrzc.supabase.co:5432/postgres
OPENAI_API_KEY=<PEGAR_TU_PROPIA_OPENAI_KEY>
```

> **Nota sobre OPENAI_API_KEY:** La clave de OpenAI es para la validación de fotos con IA. Si no tienes una, la app funciona igual, solo la sección de "Validar con foto" mostrará un mensaje de no disponible.

### Paso 3: Configurar las variables de entorno del Frontend

Crea o edita el archivo `frontend/.env.local` con el siguiente contenido:

```env
NEXT_DEV_API_PROXY_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_OFFLINE_MODE=false
```

### Paso 4: Instalar dependencias del Backend

```bash
cd backend

# Crear entorno virtual (si no existe)
python -m venv .venv

# Activar entorno virtual
# En Windows:
.venv\Scripts\activate
# En Mac/Linux:
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### Paso 5: Sincronizar las migraciones con Supabase

La base de datos ya está creada y migrada, pero debes asegurarte de que tu entorno local esté al día:

```bash
# (Dentro de backend/, con el .venv activado)
flask db upgrade
```

Si ves algo como `Running upgrade ... -> c3db1f1fdb1f` es normal. Si dice que ya está en `head`, todo está bien.

### Paso 6: Iniciar el Backend

```bash
# (Dentro de backend/, con el .venv activado)
python run.py
```

Deberías ver:
```
* Serving Flask app 'app'
* Running on http://0.0.0.0:5000
```

### Paso 7: Instalar dependencias del Frontend

```bash
cd frontend
npm install
```

### Paso 8: Iniciar el Frontend

```bash
npm run dev
```

Abre tu navegador en **http://localhost:3000** (o el puerto que indique la terminal).

---

## 5. Verificar que Todo Funciona

Puedes correr el script de verificación de la base de datos incluido en el proyecto:

```bash
# (Dentro de backend/, con el .venv activado)
python healthcheck_db.py
```

La salida esperada es:
```
DATABASE_URL points to: db.kayskvijsjdpmugbhrzc.supabase.co:5432/postgres

[OK] Tables found (12): ['achievements', 'alembic_version', ...]
[OK] Alembic version(s): ['c3db1f1fdb1f']
[OK] Table 'habitos_usuario' has all required columns.
[OK] Table 'achievements' has all required columns.
[OK] Table 'user_achievements' has all required columns.
[OK] Table 'users' has all required columns.
[OK] achievements catalog has 3 entries.

[PASS] All checks passed! Database is healthy.
```

---

## 6. Arquitectura Actual del Proyecto

```
StreakUp/
├── backend/           # Flask + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── models/    # Modelos de la base de datos
│   │   ├── routes/    # Endpoints de la API REST
│   │   ├── services/  # Lógica de negocio
│   │   └── config.py  # Variables de entorno
│   ├── migrations/    # Migraciones de Alembic (12 en total)
│   ├── .env           # Variables de entorno locales (NO subir a git)
│   └── run.py         # Punto de entrada del servidor
│
└── frontend/          # Next.js 15 + App Router + TypeScript
    ├── app/
    │   └── (dashboard)/  # Páginas protegidas por autenticación
    │       ├── page.tsx       # Home / Check-ins
    │       ├── profile/       # Perfil y logros
    │       ├── pomodoro/      # Timer Pomodoro
    │       └── habits/        # Gestión de hábitos
    ├── components/    # Componentes reutilizables
    ├── services/      # Capa de acceso a la API
    └── .env.local     # Variables de entorno del frontend (NO subir a git)
```

---

## 7. Notas Importantes para tu Agente de IA

Si vas a usar un asistente de IA (como Antigravity, Copilot, etc.) para continuar el desarrollo, pégale este contexto al inicio de la sesión:

```
Proyecto: StreakUp
Stack: Flask (Python) + Next.js 15 (TypeScript)
Base de datos: PostgreSQL en Supabase
ORM: SQLAlchemy con Flask-Migrate (Alembic)
Autenticación: JWT con Flask-JWT-Extended
Estado actual: Base de datos migrada a Supabase. Todas las migraciones aplicadas hasta c3db1f1fdb1f (head). Frontend apunta a backend local en localhost:5000. La validación de fotos usa OpenAI Vision API (gpt-4o-mini).
Próxima tarea: Implementar el sistema de IA de Maslow para dificultad adaptativa de hábitos (difficulty_service.py).
```

---

## 8. Problemas Conocidos

| Problema | Estado | Nota |
|---|---|---|
| Validación de fotos muestra "no disponible" | ⚠️ Pendiente | La `OPENAI_API_KEY` del proyecto puede haber expirado. Configurar una propia en `.env`. |
| La app redirige al home sin login al arrancar | ✅ Resuelto | Borrar cookies del navegador en `localhost`. |
| Render DB caducó | ✅ Resuelto | Migrado a Supabase. |

---

*Cualquier duda, preguntarle a Gustavo o revisar el archivo `requerimientos/dev_plan_fases.md` para el plan de desarrollo completo.*
