# Validación de Ruta de Despliegue: Backend Hosteado + Frontend Retargeteado + APK Funcional

## 1. Executive Verdict

### ¿Puede hostearse el backend ahora?
- **No todavía.**
- El backend está cerca de ser hosteable para MVP, pero aún tiene bloqueos reales de despliegue limpio:
  - el esquema migrado está incompleto
  - la base de datos migrada no reconstruye el catálogo requerido
  - no existe todavía una ruta de arranque de producción adecuada

### ¿Puede el frontend actualizarse para consumir un backend hosteado con cambios menores?
- **Sí, para los flujos principales, mayormente con configuración.**
- La arquitectura del cliente ya centraliza el consumo del API y ya soporta `NEXT_PUBLIC_API_URL`.
- Sin embargo, no es puramente “config-only” porque:
  - hoy existe una reescritura local fija a `localhost:5000`
  - la edición de hábitos online sigue deshabilitada por diseño

### ¿Puede el APK funcionar contra un backend hosteado?
- **Sí, pero no de inmediato.**
- La ruta es realista, pero todavía hay bloqueos técnicos:
  - el pipeline web de Capacitor no está alineado con la salida real de Next.js
  - el APK necesita un `NEXT_PUBLIC_API_URL` hosteado en build time
  - los bloqueos actuales del backend también romperían flujos dentro del APK

### Veredicto global
- **La ruta completa de despliegue aún no está lista.**
- El orden correcto es:
  1. corregir backend para hosting limpio
  2. retargetear frontend a backend hosteado
  3. arreglar pipeline/build móvil y generar APK apuntando al backend hosteado

---

## 2. Backend Hosting Readiness

### Estado
- **NOT READY**
- **Hosteable para MVP después de pocos cambios concretos**

### Qué ya está listo
- Validación fuerte de secretos en runtime:
  - `backend/app/config.py`
- Enforzamiento de foreign keys en SQLite:
  - `backend/app/extensions.py`
- Eliminación de logging sensible:
  - validado por tests en `backend/tests/test_runtime_security.py`
- Consistencia de XP/check-ins:
  - validada por tests en `backend/tests/test_xp_consistency.py`

### Bloqueos exactos

#### 1. El esquema migrado está incompleto
- **Problema:**
  - El modelo y rutas de Pomodoro existen, pero la tabla `pomodoro_sessions` no existe en la migración inicial ni en `schema.sql`.
- **Impacto:**
  - un deploy fresco puede arrancar, pero `/api/pomodoro/sessions` falla con `500`
- **Archivos afectados:**
  - `backend/app/models/pomodoro_session.py`
  - `backend/app/routes/pomodoro_routes.py`
  - `backend/migrations/versions/0001_initial_baseline.py`
  - `data/db/schema.sql`

#### 2. Un deploy limpio no reconstruye el catálogo requerido
- **Problema:**
  - `flask db upgrade` crea tablas, pero no crea categorías ni hábitos del catálogo.
- **Impacto:**
  - la app queda “arrancada” pero funcionalmente vacía
  - `/api/habits/catalog` puede responder lista vacía
- **Archivos afectados:**
  - `backend/migrations/versions/0001_initial_baseline.py`
  - `data/db/seed.sql`
  - `Makefile`

#### 3. No existe una ruta de arranque real para producción
- **Problema:**
  - solo existe `run.py` usando el servidor de desarrollo de Flask
- **Impacto:**
  - no es una forma correcta de servir el backend hosteado
- **Archivos afectados:**
  - `backend/run.py`
  - `backend/requirements.txt`

#### 4. La validación con OpenAI puede desplegarse rota
- **Problema:**
  - `OPENAI_API_KEY` no se valida al inicio aunque la validación por foto depende de ella
- **Impacto:**
  - el backend puede parecer “sano” pero fallar en runtime cuando el usuario usa validación
- **Archivos afectados:**
  - `backend/app/config.py`
  - `backend/app/services/openai_service.py`
  - `backend/app/routes/validation_routes.py`

#### 5. Faltan mínimos operativos de hosting
- **Problemas:**
  - no hay healthcheck
  - no hay readiness endpoint
  - no hay documentación de despliegue
  - no hay startup command de producción

### Opción de hosting recomendada
- **Mejor opción actual:** VPS único o Docker host único con volumen persistente

### Por qué
- La arquitectura actual usa SQLite y asume una instancia única con disco local persistente.
- Eso encaja mucho mejor en:
  - VPS
  - host Docker único
- Render / Railway / Fly.io son posibles para MVP, pero solo después de corregir:
  - bootstrap de BD
  - tabla faltante
  - startup de producción

### SQLite verdict
- **Aceptable para MVP hosting**
- **No adecuada para despliegue escalado o HA**

### Cuándo sí sirve
- una sola instancia
- bajo volumen de escritura
- disco persistente
- backups disciplinados

### Cuándo deja de ser suficiente
- múltiples réplicas
- alta concurrencia de escritura
- alta disponibilidad
- crecimiento operacional serio

---

## 3. Frontend Retargeting Readiness

### Estado
- **Mayormente listo para retargeting por configuración**
- Pero aún no completamente libre de supuestos locales

### Estrategia actual de API base URL

#### Capa centralizada ya existente
- El frontend resuelve base URL en:
  - `frontend/services/config/runtime.ts`
- El cliente compartido consume esa resolución en:
  - `frontend/services/api/client.ts`

#### Comportamiento actual
- Si `NEXT_PUBLIC_API_URL` existe:
  - usa esa URL absoluta
- Si no existe:
  - en web retorna `""`
  - eso hace que los fetch usen rutas relativas `/api/...`
- En la app nativa:
  - si no existe `NEXT_PUBLIC_API_URL`, lanza error de configuración
  - además prohíbe `localhost`

### Supuestos locales detectados

#### Rewrite local fijo
- `frontend/next.config.ts` reescribe `/api/:path*` hacia:
  - `http://localhost:5000/api/:path*`
- Esto es útil para dev local, pero no para despliegue real.

#### Implicación
- Mientras el navegador use rutas relativas `/api/...` sin `NEXT_PUBLIC_API_URL`, el frontend web queda atado a esa reescritura local.

### Qué debe cambiar para apuntar al backend hosteado

#### Cambios de configuración
- Definir `NEXT_PUBLIC_API_URL=https://backend-hosteado/...` para builds reales
- Mantener `NEXT_PUBLIC_OFFLINE_MODE=false` en builds conectados

#### Cambio recomendado en `next.config.ts`
- Reemplazar la rewrite hardcodeada por una de estas opciones:
  - una rewrite basada en variable de entorno
  - o eliminar rewrite y consumir siempre la URL absoluta vía `NEXT_PUBLIC_API_URL`

### Revisión de módulos clave

#### Auth
- Usa bearer token en `localStorage`
- No depende de cookies
- No depende de sesiones server-side en navegador
- Eso simplifica retargeting remoto

#### Habits
- list/create/delete ya consumen backend remoto a través del cliente común
- **pero update online sigue bloqueado**

#### Stats
- consumen backend remoto de forma centralizada

#### Validation
- ya consume el backend remoto por API compartida

#### Protected routes
- la protección de dashboard es client-side, basada en sesión local
- funcional para MVP, pero no es una protección server-side fuerte

### ¿Config-only o requiere lógica?

#### Config-only para:
- login
- register
- listar hábitos
- catálogo
- check-ins
- stats
- validación por foto

#### Requiere cambios de lógica para:
- edición online de hábitos
- cualquier endurecimiento real de auth/guards a nivel SSR o middleware

### Bloqueos del frontend

#### 1. Rewrite local fija a localhost
- Archivo:
  - `frontend/next.config.ts`

#### 2. Edición online de hábitos no existe
- Archivos:
  - `frontend/services/habits/habitService.ts`
  - `frontend/app/(dashboard)/habits/[id]/edit/page.tsx`

#### 3. Dependencia de bloqueos actuales del backend
- Si el backend deploya sin catálogo:
  - la pantalla de agregar hábito queda inútil
- Si Pomodoro sigue sin tabla:
  - la pantalla Pomodoro rompe en remoto también

---

## 4. APK Readiness

### Estado
- **No listo todavía**
- La ruta es factible, pero faltan cambios reales

### Supuestos actuales del APK / móvil

#### URL del backend
- La app nativa exige `NEXT_PUBLIC_API_URL`
- La configuración explícitamente rechaza `localhost`
- Esto es correcto para móvil

#### Red / permisos
- Android ya tiene permiso de Internet:
  - `android/app/src/main/AndroidManifest.xml`

#### Persistencia de auth
- Usa `localStorage` dentro del WebView
- Es funcional para MVP, aunque no ideal para producción endurecida

### Riesgos y cambios necesarios

#### 1. Desalineación entre Capacitor y output real de Next
- `frontend/capacitor.config.json` espera:
  - `webDir: "out"`
- Pero el proyecto solo define:
  - `next build`
- No hay configuración visible de export estático en `next.config.ts`
- **Impacto:**
  - el pipeline de build para APK no está confiablemente listo

#### 2. El APK no puede depender de rewrites de Next
- En móvil no sirve la reescritura de dev local
- El APK necesita compilarse con:
  - `NEXT_PUBLIC_API_URL=https://backend-hosteado`

#### 3. Los bloqueos del backend rompen el APK también
- catálogo vacío rompe alta de hábitos
- pomodoro sin tabla rompe el módulo Pomodoro
- validación sin OpenAI configurado rompe validación por foto

#### 4. Captura de foto en validación
- Hoy usa `input type="file" capture="environment"`
- Para MVP Android puede ser suficiente
- Pero es un riesgo de compatibilidad comparado con usar plugin nativo de cámara

#### 5. HTTPS
- Si el backend hosteado no está en HTTPS público, la ruta móvil se vuelve problemática
- Para APK funcional real:
  - el backend debe exponerse por HTTPS

### Mínimo camino a un APK funcional
1. Corregir backend para despliegue limpio
2. Hostear backend
3. Alinear build web de Next con `webDir` de Capacitor
4. Compilar frontend con `NEXT_PUBLIC_API_URL` del backend hosteado
5. Ejecutar `cap sync android`
6. Generar APK
7. Validar flujos reales en dispositivo

---

## 5. Deployment Path

### Step 1
- Corregir backend para deploy limpio

#### Incluye
- agregar `pomodoro_sessions` a migración/schema
- agregar bootstrap/seed idempotente del catálogo
- agregar servidor WSGI real
- endurecer startup/config de validación OpenAI
- agregar healthcheck

#### Validación después
- correr tests backend
- correr migración sobre DB vacía
- confirmar:
  - auth OK
  - catálogo con datos
  - pomodoro sin `500`
  - validación con configuración correcta

### Step 2
- Hostear backend en entorno real de instancia única con almacenamiento persistente

#### Validación después
- probar desde cliente externo:
  - login
  - register
  - catálogo
  - asignación de hábito
  - check-in
  - stats
  - pomodoro
  - validación

### Step 3
- Retargetear frontend web al backend hosteado

#### Incluye
- definir `NEXT_PUBLIC_API_URL`
- eliminar o parametrizar rewrite local
- verificar modo online

#### Validación después
- probar frontend web apuntando al backend hosteado
- verificar flujos principales

### Step 4
- Corregir pipeline de build móvil

#### Incluye
- alinear salida real de Next con `webDir`
- preparar build estático o ajustar Capacitor

#### Validación después
- generar assets consumibles por Capacitor
- ejecutar sync Android sin inconsistencias

### Step 5
- Generar APK apuntando al backend hosteado

#### Incluye
- build con `NEXT_PUBLIC_API_URL=https://backend-hosteado`
- `NEXT_PUBLIC_OFFLINE_MODE=false`

#### Validación después
- instalar APK y verificar:
  - login
  - persistencia de sesión
  - carga del catálogo
  - check-ins
  - stats
  - validación por foto
  - pomodoro

---

## 6. Remaining Required Changes

## Backend hosting blockers

### 1. Tabla faltante de Pomodoro
- **Tipo:** code change
- **Archivos:**
  - `backend/migrations/versions/0001_initial_baseline.py`
  - `data/db/schema.sql`
- **Bloquea:**
  - backend hosteado
  - frontend remoto
  - APK funcional

### 2. Bootstrap/seed del catálogo no hosteable
- **Tipo:** code + operational change
- **Archivos:**
  - `backend/migrations/versions/0001_initial_baseline.py`
  - `data/db/seed.sql`
  - flujo de despliegue
- **Bloquea:**
  - alta/asignación de hábitos en frontend y APK

### 3. No existe startup de producción
- **Tipo:** code/config change
- **Archivos:**
  - `backend/run.py`
  - `backend/requirements.txt`
- **Bloquea:**
  - hosting real confiable

### 4. Validación OpenAI no endurecida
- **Tipo:** code/config change
- **Archivos:**
  - `backend/app/config.py`
  - `backend/app/services/openai_service.py`
  - `backend/app/routes/validation_routes.py`
- **Bloquea:**
  - funcionalidad completa en frontend y APK

### 5. Faltan health/readiness mínimos
- **Tipo:** code/ops change
- **Bloquea:**
  - hosting y operación confiables

## Frontend retargeting blockers

### 1. Rewrite hardcodeada a localhost
- **Tipo:** config/code change
- **Archivo:**
  - `frontend/next.config.ts`

### 2. Edición online de hábitos no implementada
- **Tipo:** code change
- **Archivos:**
  - `frontend/services/habits/habitService.ts`
  - `frontend/app/(dashboard)/habits/[id]/edit/page.tsx`
  - backend correspondiente

### 3. Dependencia de backend completo
- **Tipo:** propagated blocker
- **Impacta:**
  - catálogo
  - pomodoro
  - validación

## APK blockers

### 1. `webDir=out` no alineado con build real de Next
- **Tipo:** build/config change
- **Archivos:**
  - `frontend/capacitor.config.json`
  - `frontend/package.json`
  - `frontend/next.config.ts`

### 2. Build móvil necesita API hosteada explícita
- **Tipo:** config change
- **Requiere:**
  - `NEXT_PUBLIC_API_URL`

### 3. Backend debe exponerse por HTTPS
- **Tipo:** hosting/config requirement

### 4. Validación por cámara es MVP-level
- **Tipo:** optional code improvement
- **No bloquea necesariamente MVP**, pero sí es un riesgo operativo/compatibilidad

---

## Clasificación Final

- **Backend:** no listo todavía; hosteable para MVP tras pocas correcciones reales
- **Frontend retargeting:** mayormente listo por configuración, pero no completamente libre de cambios
- **APK:** ruta viable, pero hoy no lista; requiere correcciones de backend y del pipeline de build móvil

## Conclusión final

El proyecto **sí puede llegar** a:
- backend hosteado
- frontend apuntando a backend hosteado
- APK funcional contra backend hosteado

Pero **todavía no puede hacerlo de forma confiable hoy**.

La prioridad correcta no es tocar el APK primero.
La prioridad correcta es:
1. cerrar bloqueos reales del backend
2. retargetear frontend con configuración adecuada
3. arreglar el pipeline de Capacitor/Next y luego construir el APK
