# Recon Funcional End-to-End: StreakUP

## Alcance y evidencia

Baselines auditadas:

- DB fresca reproducible desde `data/db/schema.sql` + `data/db/seed.sql`
- DB actual del workspace: `data/app.db`

Validaciones ejecutadas:

- Backend: `./.venv/bin/python -m unittest discover -s tests` desde `backend/` -> `10 tests OK`
- Frontend unitario: `node --import ./tests/register-aliases.mjs --test ./tests/unit/*.test.ts` desde `frontend/` -> `3 tests OK`
- Frontend build: `npm run build` desde `frontend/` -> `OK`
- Frontend lint: `npm run lint` desde `frontend/` -> `OK`
- Flujo E2E aislado con `Flask.test_client()` sobre SQLite temporal
- Auditoria SQL directa sobre `data/app.db`

Limitaciones de la validacion:

- No se ejecuto automatizacion de navegador real.
- La validacion por IA se probo a nivel de integracion backend con `analyze_habit_image` stubbeado para verificar persistencia y side effects sin depender de red ni de OpenAI.
- No se probo APK/Capacitor en dispositivo movil.

## 1. Executive Summary

### Overall system status

**StreakUP no esta listo para despliegue.**

El nucleo funcional backend si demuestra una base operativa cuando la base de datos existe en un estado consistente: registro, login, asignacion de habito, check-in, stats y validacion por foto funcionan en un entorno aislado. El problema es que el sistema no puede reconstruir de forma reproducible ese estado, y ademas hay riesgos estructurales de seguridad, integridad de datos y observabilidad engañosa en frontend.

### What works

- El flujo backend aislado `register -> login -> assign habit -> toggle checkin -> stats` funciona con respuestas consistentes.
- `user_id` fluye correctamente desde JWT hasta `habitos_usuario`, `registro_habitos`, `validaciones` y `xp_logs` en la prueba aislada.
- La proteccion JWT existe y las rutas protegidas responden `401` sin token.
- El frontend compila y pasa lint/unit tests.
- La DB actual contiene datos consistentes para al menos un usuario autenticable y las rutas `/api/habits`, `/api/checkins/today`, `/api/stats/summary`, `/api/stats/detailed` y `/api/stats/xp` responden en coherencia con `data/app.db`.

### What is broken

- La baseline fresca no es reproducible: `seed.sql` falla contra el `CHECK` de `dificultad`.
- SQLite corre con `PRAGMA foreign_keys = 0` dentro de la app real y en la app aislada, asi que las FK declaradas no se estan haciendo cumplir en runtime.
- La app imprime en logs informacion sensible de autenticacion, incluyendo `password_hash` y la URI de base de datos.
- El `JWT_SECRET_KEY` efectivo del entorno actual tiene longitud insegura de 20 bytes y ya dispara `InsecureKeyLengthWarning`.
- La pagina de estadisticas puede mostrar datos ficticios aunque el backend falle o aunque el usuario no tenga datos reales.

### What is incomplete

- La edicion online de habitos esta explicitamente no implementada y responde `501`.
- La validacion de habitos real solo existe para `foto`; `timer`, `simple check` y otros modos no estan implementados como flujo persistente real.
- `user_routes.py` y `sync_routes.py` son placeholders sin endpoints reales.
- Alembic/Flask-Migrate esta presente en dependencias, pero no hay migraciones reales versionadas.

### What blocks deployment

- DB reproducible rota (`seed.sql`)
- Integridad referencial no forzada (`foreign_keys = 0`)
- Logging sensible en auth
- Secretos de runtime debiles
- Frontend que puede maquillar fallos reales con defaults/demo data

## 2. Module Diagnosis

### Auth

Estado: **parcialmente funcional con riesgos altos**

Hallazgos:

- `POST /api/auth/register` funciona y persiste usuario real con hash.
- `POST /api/auth/login` consulta la DB real, normaliza email y devuelve `access_token`, `refresh_token` y `user`.
- La UI de login y registro llama a backend real mediante `frontend/services/auth/authService.ts`.
- La sesion frontend se guarda en `localStorage` y el dashboard la considera valida con `hasSavedSession()` si hay token y JSON parseable; no valida expiracion ni forma del JWT.
- `backend/app/services/auth_service.py` imprime `LOGIN ATTEMPT`, `USER FOUND` y `HASH`.
- `backend/app/__init__.py` imprime `DB URI`.
- El secreto JWT actual medido desde la app tiene longitud 20, insuficiente para HS256 recomendado.
- El mensaje offline de login es engañoso: `"No hay conexión. Usa una sesión guardada previamente."` aunque el login no restaura ninguna sesion.

Impacto:

- El login backend funciona.
- La seguridad operativa no es aceptable para produccion.
- Una sesion vieja en `localStorage` puede dejar pasar el guard del dashboard hasta que falle la primera request real.

### Users

Estado: **funcional a nivel de identidad, inconsistente a nivel de experiencia**

Hallazgos:

- En la prueba aislada el `sub` del JWT se resuelve correctamente y las consultas quedan scopeadas por `user_id`.
- La DB actual tiene 4 usuarios.
- La relacion `users -> habitos_usuario -> registro_habitos/validaciones/xp_logs` existe y fue verificada con consultas SQL y endpoints.
- No hay endpoints reales de perfil/usuario en backend; la pagina de perfil depende de stats + session local.
- En `frontend/app/(dashboard)/profile/page.tsx`, `totalCheckins` para logros usa `stats.today_completed` en lugar del total historico, por lo que los achievements se calculan mal.

Impacto:

- La identidad y el scoping principal funcionan.
- La capa de perfil no tiene un bounded context real de usuario.

### Habits

Estado: **funcional para catalogo + asignacion; incompleto como producto**

Hallazgos:

- El sistema no crea habitos libres; "crear habito" en realidad asigna una entrada del catalogo (`habito_id`) al usuario.
- `GET /api/habits/catalog` y `POST /api/habits` funcionan en la prueba aislada.
- `POST /api/habits` bloquea duplicados activos con `409`.
- `GET /api/habits` devuelve habitos activos del usuario autenticado con payload compatible con frontend.
- La pagina `frontend/app/(dashboard)/habits/new/page.tsx` refleja ese modelo de asignacion de catalogo.
- La edicion online no existe: `PUT /api/habits/:id` responde `501` y la UI lo muestra como "solo disponible en modo offline".

Impacto:

- El flujo pedido de crear/asociar habito funciona solo si se interpreta como "asignar desde catalogo".
- Si el requerimiento de negocio era crear habitos personalizados en backend, hoy no existe.

### Habit completion / validation

Estado: **check-in funcional; validacion parcial**

Hallazgos:

- `POST /api/checkins/toggle` funciona sobre `UserHabit.id`, no sobre `Habit.id` de catalogo.
- La unicidad por fecha existe en modelo y la secuencia `check -> uncheck -> check` persiste correctamente en la prueba aislada.
- `GET /api/checkins/today` refleja el estado real del dia.
- `POST /api/habits/validate` crea `ValidationLog`, evita doble validacion diaria, otorga XP y crea check-in si no existia.
- El flujo real implementado es solo `foto`.
- No se encontraron endpoints reales para `timer`, `manual/simple check` ni otros modos de evidencia como producto separado.
- El `CheckIn.xp_ganado` queda en `0` incluso cuando la validacion otorga 50 XP en `xp_logs`; el XP vive desacoplado del registro de check-in.

Impacto:

- El completado basico funciona.
- La validacion esta incompleta frente al alcance solicitado.
- El tracking de XP por check-in no esta centralizado en un solo artefacto persistente.

### Frontend

Estado: **compila y conecta; pero puede ocultar problemas reales**

Hallazgos:

- `npm run build`, `npm run lint` y los tests unitarios pasan.
- Auth, habits, checkins, stats, pomodoro y validation llaman endpoints reales.
- `frontend/app/(dashboard)/stats/page.tsx` usa `DEMO_DATA` cuando `total_habits === 0` y tambien cuando hay fallos de red recuperables.
- La pagina de dashboard y profile hacen `catch` silencioso y muestran ceros/defaults.
- El layout privado solo revisa `hasSavedSession()`; no valida token ni refresca identidad.

Impacto:

- La app puede "parecer sana" aunque el backend este caido, el usuario no tenga datos reales o la sesion ya no sea valida.
- Esto es un riesgo directo para readiness porque enmascara bugs de integracion.

### Backend

Estado: **base operativa con deuda critica**

Hallazgos:

- Los blueprints activos son `auth`, `habits`, `checkins`, `stats`, `pomodoro`, `validation`.
- `user_routes.py` y `sync_routes.py` son placeholders no registrados como funcionalidad real.
- El backend test suite existente pasa, pero al ejecutarla desde la raiz del repo falla por import path; la invocacion correcta es desde `backend/`.
- `xp_service.py` usa `Query.get()`, ya marcado como legacy por SQLAlchemy.
- No hay inicializacion explicita de `PRAGMA foreign_keys = ON` a nivel de conexion SQLAlchemy.
- Hay logging sensible en runtime.

Impacto:

- La arquitectura base funciona.
- La operacion y mantenimiento para produccion no esta cerrada.

### Database

Estado: **la DB actual sirve; la estrategia de DB no**

Hallazgos:

- `schema.sql` crea las tablas esperadas.
- `seed.sql` falla en una DB limpia porque inserta `Fácil/Media/Difícil` mientras el `CHECK` exige `facil/media/dificil`.
- El seed falla a mitad de ejecucion: quedan usuarios y categorias insertados, pero `habitos` queda en `0`.
- `data/app.db` si contiene 12 habitos con dificultades normalizadas, lo que demuestra drift entre baseline reproducible y baseline actual.
- `backend/migrations/` solo contiene scaffolding; no hay migraciones versionadas reales.
- La app real y la app aislada operan con `PRAGMA foreign_keys = 0`.

Impacto:

- No existe una ruta confiable y repetible para reconstruir el estado desplegable.
- La integridad referencial depende de la disciplina de la aplicacion, no de la DB.

## 3. Tested Flows

| Flujo | Expected behavior | Actual behavior | Result | Root cause if failed |
|---|---|---|---|---|
| Inicializar DB fresca con `schema.sql` + `seed.sql` | Crear schema y datos base completos | Falla en `CHECK constraint failed: dificultad IN ('facil','media','dificil')`; quedan usuarios y categorias, pero `habitos = 0` | **FAIL** | Drift entre `schema.sql` y `seed.sql` |
| Register user en DB aislada | `201`, usuario persistido con email normalizado | `201`, usuario creado en `users`, email guardado en minusculas | **PASS** | - |
| Login en DB aislada | `200`, tokens y user reales desde DB | `200`, devuelve `access_token`, `refresh_token`, `user` | **PASS** | - |
| Login invalido | `401` consistente | `401 {"error":"Invalid email or password."}` | **PASS** | - |
| Fetch catalogo | Lista de habitos reales | `200`, 2 habitos en catalogo de prueba | **PASS** | - |
| Crear/asignar habito | Asociar habito correcto al usuario | `201`, crea fila en `habitos_usuario` con `user_id` correcto | **PASS** | - |
| Evitar duplicado activo | `409` | `409 {"error":"This habit is already active for the user."}` | **PASS** | - |
| Fetch mis habitos | Solo habitos del usuario autenticado | `200`, lista filtrada por JWT user | **PASS** | - |
| Toggle completion | Crear/eliminar/crear check-in del dia sin duplicados | Secuencia `true -> false -> true`; `registro_habitos` queda con una fila | **PASS** | - |
| Fetch today habits | Reflejar `checked_today` real | `200`, `checked_today: true` despues del toggle final | **PASS** | - |
| Stats tras check-in | Hoy, racha y rate consistentes | `today_completed=1`, `today_total=1`, `streak=1`, `completion_rate=14` | **PASS** | - |
| Validacion foto exitosa | Crear log, impedir duplicado diario, otorgar XP, contar validacion | `200`, `xp_ganado=50`, `validations_today=1`; segundo intento `400` | **PASS (parcial)** | Integracion externa con OpenAI no validada; solo flujo foto |
| Impacto en XP | Aumentar `total_xp`, `xp_in_level`, `progress_pct` | `total_xp=50`, `xp_in_level=50`, `progress_pct=20.0` | **PASS** | - |
| Impacto en `CheckIn.xp_ganado` | Persistir XP del evento o dejar contrato claro | Check-in queda con `xp_ganado=0` aunque se otorgaron 50 XP | **PARTIAL** | XP desacoplado en `xp_logs`, no en `registro_habitos` |
| Stats reales en DB actual | Reflejar contenido real de `data/app.db` | Para el usuario autenticado probado, `/api/habits`, `/api/checkins/today`, `/api/stats/*` coinciden con la DB | **PASS** | - |
| Frontend stats sin datos/fallo | Mostrar estado real o vacio honesto | Puede mostrar `DEMO_DATA` y banner de datos ficticios | **FAIL** | Fallback demo en `frontend/app/(dashboard)/stats/page.tsx` |

## 4. Bug List

### 1. Seed reproducible roto por mismatch de `dificultad`

- Severity: **critical**
- Affected module: Database
- Evidence: `data/db/schema.sql`, `data/db/seed.sql`
- Detail: `schema.sql` exige `facil/media/dificil`; `seed.sql` inserta variantes con mayusculas y acentos. La DB limpia no se puede reconstruir correctamente.

### 2. SQLite corre con foreign keys desactivadas

- Severity: **critical**
- Affected module: Database / Backend
- Evidence: `PRAGMA foreign_keys` devolvio `0` en la app real y en la app aislada
- Detail: Las FK existen en schema/modelos, pero no se hacen cumplir en runtime.

### 3. Logging sensible en autenticacion y bootstrap

- Severity: **critical**
- Affected module: Auth / Backend
- Evidence: `backend/app/__init__.py`, `backend/app/services/auth_service.py`
- Detail: Se imprime URI de DB, intentos de login, objeto usuario y `password_hash`.

### 4. JWT secret efectivo demasiado corto

- Severity: **high**
- Affected module: Auth / Security
- Evidence: app real con `jwt_secret_len = 20` y warning de PyJWT
- Detail: HS256 recomienda minimo 32 bytes; el entorno actual no lo cumple.

### 5. Frontend stats puede ocultar fallos reales con datos ficticios

- Severity: **high**
- Affected module: Frontend / Stats
- Evidence: `frontend/app/(dashboard)/stats/page.tsx`
- Detail: Si no hay habitos o si hay error recuperable, la UI sustituye estado real por `DEMO_DATA`.

### 6. No hay migraciones reales aunque el proyecto depende de Flask-Migrate

- Severity: **high**
- Affected module: Database / Backend
- Evidence: `backend/migrations/` contiene solo scaffolding
- Detail: No existe historia de cambios de schema ni mecanismo real para evolucionar la DB en despliegue.

### 7. Edicion online de habitos no implementada

- Severity: **medium**
- Affected module: Habits / Frontend / Backend
- Evidence: `backend/app/routes/habit_routes.py`, `frontend/app/(dashboard)/habits/[id]/edit/page.tsx`
- Detail: `PUT /api/habits/:id` devuelve `501`; la UI de edicion solo funciona offline.

### 8. Validacion solo soporta foto

- Severity: **medium**
- Affected module: Habit validation
- Evidence: `backend/app/routes/validation_routes.py`, `backend/app/services/validation_service.py`
- Detail: No hay flujos reales persistentes para `timer`, `manual/simple check` ni otros tipos solicitados.

### 9. Dashboard y profile silencian fallos de API

- Severity: **medium**
- Affected module: Frontend
- Evidence: `frontend/app/(dashboard)/page.tsx`, `frontend/app/(dashboard)/profile/page.tsx`
- Detail: Ante error, la UI cae a ceros/defaults sin exponer claramente que el dato real no se pudo cargar.

### 10. Guard de sesion basado solo en `localStorage`

- Severity: **medium**
- Affected module: Frontend / Auth
- Evidence: `frontend/app/(dashboard)/layout.tsx`, `frontend/services/auth/authService.ts`
- Detail: La app considera autenticado a cualquier cliente con token y `user` parseable, sin validar expiracion.

### 11. Logros del perfil calculados con el dato equivocado

- Severity: **medium**
- Affected module: Frontend / Profile
- Evidence: `frontend/app/(dashboard)/profile/page.tsx`
- Detail: `totalCheckins` usa `stats.today_completed` en vez del total historico.

### 12. Mensaje offline de login engañoso

- Severity: **low**
- Affected module: Frontend / Auth
- Evidence: `frontend/services/auth/authService.ts`
- Detail: El mensaje sugiere usar una sesion guardada, pero el flujo de login no restaura ninguna sesion.

### 13. Ejecutar tests backend desde la raiz del repo falla

- Severity: **low**
- Affected module: DX / Validation
- Evidence: `backend/tests/test_auth_flow.py`, import path
- Detail: El comando funciona desde `backend/`, pero no desde la raiz con discovery simple.

### 14. Uso de API legacy de SQLAlchemy

- Severity: **low**
- Affected module: Backend / Stats / XP
- Evidence: `backend/app/services/xp_service.py`, `backend/app/services/stats_service.py`
- Detail: Se usa `Query.get()`, ya marcado como legacy por SQLAlchemy 2.x.

## 5. Remediation Backlog

### P0 - Bloqueantes de despliegue

1. Corregir `data/db/seed.sql` para usar valores validos de `dificultad` y hacer la carga atomica.
2. Forzar `PRAGMA foreign_keys = ON` en cada conexion SQLite desde SQLAlchemy.
3. Eliminar todos los `print()` sensibles de auth/bootstrap y reemplazarlos por logging seguro.
4. Rotar `JWT_SECRET_KEY` y `SECRET_KEY` a valores robustos de al menos 32 bytes.
5. Desactivar `DEMO_DATA` en produccion o cambiarlo por empty/error states honestos.

### P1 - Consistencia funcional

1. Decidir y documentar si "crear habito" significa asignar catalogo o crear habito custom; alinear UI, backend y lenguaje del producto.
2. Implementar o retirar la edicion online de habitos; hoy el enlace existe pero el backend responde `501`.
3. Definir un modelo coherente para XP por check-in vs XP por validacion y reflejarlo en persistencia y stats.
4. Endurecer el guard de sesion frontend con validacion del JWT o un `me/session check`.

### P2 - Completitud de producto y operacion

1. Implementar migraciones reales con Alembic o retirar Flask-Migrate del camino oficial.
2. Implementar estados de error visibles en dashboard/profile en vez de silencios/defaults.
3. Corregir achievements del perfil para usar datos historicos reales.
4. Completar los modos de validacion faltantes o marcarlos explicitamente como fuera de scope.

## 6. Conclusion

StreakUP tiene un backend MVP funcional en sus flujos nucleares cuando se le entrega una DB coherente, pero hoy falla el criterio de deploy readiness por cuatro razones: no puede recrear su baseline de datos, no protege su integridad referencial en SQLite, expone informacion sensible en logs y permite que el frontend maquille estados no reales. Antes de desplegar, hay que resolver al menos los items P0.
