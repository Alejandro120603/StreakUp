# Reporte de Implementacion: Fix Critico StreakUP

Fecha: 2026-04-05

## 1. Resumen ejecutivo

Se implemento el plan de remediacion para StreakUP con foco en los bloqueos P0 de despliegue y en los ajustes de consistencia definidos para P1/P2.

Estado final:

- P0 DB reproducible: resuelto
- P0 enforcement de foreign keys en SQLite runtime: resuelto
- P0 logging sensible en auth/bootstrap: resuelto
- P0 endurecimiento de secretos runtime: resuelto
- P0 fallback enganoso de stats con demo data: resuelto
- P1 copy "crear" vs "asignar" habito: resuelto
- P1 edicion online inconsistente: resuelto con politica offline-only
- P1 consistencia de XP entre check-in y validacion: resuelto
- P1 guard de sesion frontend demasiado laxo: resuelto
- P2 migracion inicial versionada: resuelto
- P2 perfil con achievements usando fuente incorrecta: resuelto
- P2 lenguaje de validacion fuera de alcance real: ajustado a foto-only

Resultado general:

- Backend validado y estable para los cambios implementados
- Frontend unitario validado
- Queda un bloqueo local de build frontend ajeno a estos cambios: faltan dependencias instaladas en `frontend/node_modules` (`next-themes`, `framer-motion`)

## 2. Alcance ejecutado

### P0.1 DB fresca reproducible

Archivo:

- `data/db/seed.sql`

Problema:

- El seed insertaba `Fácil`, `Media`, `Difícil`, pero el schema solo acepta `facil`, `media`, `dificil`.

Cambio:

- Se normalizaron todos los valores de `dificultad` al enum real de la DB.

Resultado:

- Una DB temporal creada desde `schema.sql` + `seed.sql` carga completa y consistentemente.

Conteos validados:

- `users=4`
- `categorias=3`
- `habitos=12`

### P0.2 Foreign keys activas en runtime

Archivo:

- `backend/app/extensions.py`

Problema:

- SQLAlchemy abria conexiones SQLite con `PRAGMA foreign_keys = 0` aunque el schema tuviera `PRAGMA foreign_keys = ON`.

Cambio:

- Se agrego un hook global de conexion SQLAlchemy para ejecutar `PRAGMA foreign_keys=ON` en cada conexion SQLite.

Resultado:

- La app ya no depende del `PRAGMA` del script SQL para integridad referencial.

### P0.3 Eliminacion de logs sensibles

Archivos:

- `backend/app/__init__.py`
- `backend/app/services/auth_service.py`

Problema:

- Se imprimian en stdout la DB URI y datos internos del login, incluido `password_hash`.

Cambio:

- Se removieron los `print(...)` sensibles.
- El login ahora usa `user.check_password(...)` sin exponer internals.

Resultado:

- Se mantiene el flujo funcional sin fuga de DB URI, hash o dumps del usuario.

### P0.4 Endurecimiento de secretos runtime

Archivos:

- `backend/app/config.py`
- `backend/.env.example`
- `backend/app/__init__.py`

Problema:

- La app aceptaba defaults inseguros en runtime para `SECRET_KEY` y `JWT_SECRET_KEY`.

Cambio:

- Se agrego validacion centralizada de secretos.
- Fuera de entornos dev/test, la app falla al arrancar si los secretos son placeholder o miden menos de 32 caracteres.
- Se documento el requisito en `.env.example`.

Resultado:

- Configuracion insegura deja de pasar silenciosamente en entornos tipo produccion.

### P0.5 Stats sin demo engañosa

Archivos:

- `frontend/app/(dashboard)/stats/page.tsx`
- `frontend/services/stats/statsViewState.ts`
- `frontend/tests/unit/stats-view-state.test.ts`

Problema:

- La pantalla de stats podia mostrar `DEMO_DATA` tanto sin datos reales como ante fallos del backend.

Cambio:

- Se elimino el path critico basado en `DEMO_DATA`.
- Se introdujo logica explicita de estado:
  - `ready`
  - `empty`
  - `error`

Resultado:

- Un usuario sin habitos ve estado vacio honesto.
- Un fallo real del backend muestra error honesto.
- Ya no se maquillan problemas con datos ficticios.

## 3. Ajustes funcionales de consistencia

### P1.6 "Crear habito" vs "Asignar habito"

Archivos:

- `frontend/app/(dashboard)/habits/new/page.tsx`

Cambio:

- Se actualizo el copy para reflejar el comportamiento real: agregar/asignar un habito del catalogo, no crear un habito libre en backend.

### P1.7 Edicion online inconsistente

Archivos:

- `frontend/app/(dashboard)/habits/page.tsx`
- `frontend/app/(dashboard)/habits/[id]/edit/page.tsx`

Politica aplicada:

- La edicion solo queda visible y utilizable cuando `offline mode` esta activo explicitamente.

Cambio:

- Se oculta el CTA de editar en modo online.
- La ruta de edicion muestra una pantalla honesta de "solo offline" en lugar de un formulario online falso.

### P1.8 Consistencia de XP

Archivos:

- `backend/app/services/validation_service.py`
- `backend/app/services/xp_service.py`
- `backend/tests/test_xp_consistency.py`

Problema:

- Un check-in y una validacion posterior podian desalinear la persistencia del XP.

Cambio:

- La validacion foto ahora calcula `target_xp = 1.5 * xp_base`.
- Si no existe check-in, crea el check-in con ese valor completo.
- Si ya existia check-in, solo otorga el delta faltante y actualiza `registro_habitos.xp_ganado` al valor final.

Ejemplo validado:

- Check-in normal de 10 XP
- Validacion foto posterior
- XP adicional otorgado: 5
- XP total final: 15
- `registro_habitos.xp_ganado`: 15
- `xp_logs`: `[10, 5]`

### P1.9 Guard de sesion frontend

Archivos:

- `frontend/services/auth/authService.ts`
- `frontend/tests/unit/auth-service.test.ts`

Problema:

- Bastaba tener strings parseables en `localStorage` para que el dashboard creyera que habia sesion.

Cambio:

- `getSession()` ahora valida:
  - forma JWT basica
  - payload decodificable
  - expiracion `exp`
  - shape minima del usuario guardado
- Si la sesion es invalida o expirada, se limpia storage.

Resultado:

- Sesiones malformadas o expiradas ya no pasan como autenticas.

## 4. Ajustes P2

### P2.10 Migracion inicial versionada

Archivo:

- `backend/migrations/versions/0001_initial_baseline.py`

Cambio:

- Se agrego una baseline inicial compatible con el schema actual.

### P2.11 Perfil sin defaults silenciosos y con achievements correctos

Archivo:

- `frontend/app/(dashboard)/profile/page.tsx`

Cambio:

- La pantalla ya no hace fail silencioso mostrando solo ceros.
- Se usa `detailed.summary.total_completed` como fuente real para achievements de check-ins totales.

### P2.12 Validacion alineada con alcance real

Archivo:

- `frontend/app/(dashboard)/habits/validate/page.tsx`
- `backend/app/services/validation_service.py`

Cambio:

- El lenguaje se alineo al flujo realmente soportado: validacion por foto.

## 5. Archivos creados

- `backend/tests/test_runtime_security.py`
- `backend/tests/test_xp_consistency.py`
- `backend/migrations/versions/0001_initial_baseline.py`
- `frontend/services/stats/statsViewState.ts`
- `frontend/tests/unit/stats-view-state.test.ts`
- `codex/output/reporte_fix_critico.md`

## 6. Archivos modificados

- `data/db/seed.sql`
- `backend/.env.example`
- `backend/app/__init__.py`
- `backend/app/config.py`
- `backend/app/extensions.py`
- `backend/app/services/auth_service.py`
- `backend/app/services/validation_service.py`
- `backend/app/services/xp_service.py`
- `frontend/app/(dashboard)/habits/[id]/edit/page.tsx`
- `frontend/app/(dashboard)/habits/new/page.tsx`
- `frontend/app/(dashboard)/habits/page.tsx`
- `frontend/app/(dashboard)/habits/validate/page.tsx`
- `frontend/app/(dashboard)/profile/page.tsx`
- `frontend/app/(dashboard)/stats/page.tsx`
- `frontend/services/auth/authService.ts`
- `frontend/tests/unit/auth-service.test.ts`

## 7. Validaciones ejecutadas

### Base de datos fresca

Comando/logica:

- DB temporal SQLite creada desde `data/db/schema.sql` + `data/db/seed.sql`

Resultado:

- OK
- Conteos:
  - `users=4`
  - `categorias=3`
  - `habitos=12`

### Backend

Comando:

```bash
cd backend && .venv/bin/python -m unittest tests.test_auth_flow tests.test_runtime_security tests.test_xp_consistency
```

Resultado:

- OK
- `18 tests` pasando

Cubre:

- auth flow base
- seguridad runtime
- FK enforcement
- no leakage de logs
- validacion de secretos
- consistencia de XP

### Frontend unitario

Comando:

```bash
cd frontend && node --import ./tests/register-aliases.mjs --test tests/unit/api-client.test.ts tests/unit/auth-service.test.ts tests/unit/habit-service.test.ts tests/unit/stats-view-state.test.ts
```

Resultado:

- OK
- `4 tests` pasando

## 8. Bloqueo restante

### Frontend build local

Comando ejecutado:

```bash
cd frontend && NEXT_PUBLIC_OFFLINE_MODE=false npm run build
```

Resultado:

- FAIL

Causa real observada:

- El workspace local tiene `frontend/node_modules`, pero faltan dependencias que el codigo ya referencia:
  - `next-themes`
  - `framer-motion`

Evidencia:

- `npx tsc --noEmit` reporta que esos modulos no existen.
- Tambien aparecen errores derivados en `ClayMotionBox` por faltar `framer-motion`.

Conclusion:

- El bloqueo de build actual no proviene de los cambios de remediacion aplicados.
- El siguiente paso operativo es reinstalar dependencias del frontend y volver a correr build.

## 9. Comandos recomendados para cierre operativo

### Reinstalar dependencias frontend

```bash
cd frontend && npm install
```

### Volver a validar build frontend

```bash
cd frontend && NEXT_PUBLIC_OFFLINE_MODE=false npm run build
```

### Revalidar backend completo

```bash
cd backend && .venv/bin/python -m unittest tests.test_auth_flow tests.test_runtime_security tests.test_xp_consistency
```

## 10. Conclusión

La remediacion principal quedo implementada y validada donde el entorno actual lo permite. El sistema ahora esta en un estado materialmente mas seguro y mas desplegable que al inicio:

- la DB fresca ya no falla
- SQLite si fuerza integridad referencial
- auth/bootstrap ya no exponen datos sensibles
- secrets debiles ya no pasan en runtimes no-dev
- stats ya no ocultan fallos con datos ficticios
- el flujo de edicion online falsa desaparecio
- el guard de sesion frontend es mas estricto
- la persistencia de XP es coherente entre check-in y validacion

El unico bloqueo residual observado al cierre es de entorno/dependencias del frontend build local, no de la logica corregida en esta remediacion.
