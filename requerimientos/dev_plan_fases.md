# Plan de Desarrollo por Fases — StreakUp
### Fecha: 29/04/2026
### Objetivo: Completar todos los requerimientos de Practicum I

---

## Visión General del Plan

El plan se divide en **5 fases** ordenadas por dependencia técnica y prioridad de entrega. Cada fase se puede completar de forma independiente y deja el proyecto en un estado funcional mejorado.

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
Cimientos   Core IA   Social    Offline    Polish
(3-4 días)  (3-4 días) (3-4 días) (4-5 días)  (2-3 días)
```

> [!IMPORTANT]
> **Tiempo estimado total: 15-20 días de desarrollo activo.**
> Las fases 1 y 2 son críticas y deben completarse primero. Las fases 3-5 pueden paralelizarse parcialmente.

---

## Fase 1 — Cimientos y Cierre de Brechas Básicas
**Objetivo:** Cerrar todos los puntos parciales que bloquean el resto del desarrollo.
**Duración estimada:** 3-4 días

### 1.1 Integración Frontend ↔ Backend (Robustez)
- [ ] Auditar todos los servicios del frontend (`services/`) para asegurar que manejan errores HTTP correctamente (timeouts, 4xx, 5xx).
- [ ] Implementar un interceptor global de errores de red (retry automático, mensajes amigables al usuario).
- [ ] Verificar que todos los endpoints del backend devuelven respuestas consistentes (formato `{ data, error, message }`).

### 1.2 Eliminación de Cuenta (RNF-07)
- [ ] Crear endpoint `DELETE /api/users/me` en el backend.
- [ ] Implementar lógica de cascada (eliminar hábitos, check-ins, validaciones, logros del usuario).
- [ ] Agregar UI de confirmación en la pantalla de Perfil del frontend.

### 1.3 UI de Logros/Medallas (Achievement System)
- [ ] Diseñar componente visual de medalla/badge en el frontend.
- [ ] Crear pantalla de "Mis Logros" accesible desde el perfil.
- [ ] Integrar notificación en-app cuando se desbloquea un nuevo logro (toast/modal).
- [ ] Conectar con `GET /api/achievements` existente en el backend.

### 1.4 Animaciones Visuales del Pomodoro (RF-17)
- [ ] Implementar las animaciones de paso del tiempo: Fuego (llama), Planta (crecimiento), Luna (fases).
- [ ] Permitir al usuario seleccionar el modo visual al iniciar una sesión.
- [ ] Asegurar que las animaciones sean suaves y no afecten el rendimiento.

### Entregables Fase 1:
- ✅ Comunicación frontend-backend robusta y sin errores silenciosos.
- ✅ El usuario puede eliminar su cuenta.
- ✅ Los logros se muestran visualmente.
- ✅ El Pomodoro tiene animaciones dinámicas según modo.

---

## Fase 2 — Inteligencia Artificial Avanzada
**Objetivo:** Implementar las funcionalidades de IA que aún no existen (RF-12, RF-13).
**Duración estimada:** 3-4 días
**Dependencia:** Fase 1 completada (integración estable).

### 2.1 Cálculo de Dificultad con Pirámide de Maslow (RF-12)
- [ ] Diseñar la **rúbrica de dificultad** basada en la Pirámide de Maslow:
  - Nivel 1 (Fisiológico): dormir, hidratarse → dificultad baja (5-10 XP)
  - Nivel 2 (Seguridad): ahorrar, organizar → dificultad media-baja (10-15 XP)
  - Nivel 3 (Social): llamar amigos, socializar → dificultad media (15-20 XP)
  - Nivel 4 (Estima): ejercicio, estudiar, leer → dificultad media-alta (20-30 XP)
  - Nivel 5 (Autorrealización): meditar, escribir, arte → dificultad alta (30-50 XP)
- [ ] Implementar `difficulty_service.py` con llamada a LLM (OpenAI) para clasificar el hábito según su descripción.
- [ ] Crear prompt de clasificación que reciba nombre + descripción del hábito y devuelva nivel de Maslow + XP sugerido.
- [ ] Integrar en el flujo de creación de hábito (`habit_service.py`): al crear un hábito, calcular su dificultad automáticamente.
- [ ] Añadir campo `maslow_level` y `xp_calculado` al modelo de hábito si no existe.
- [ ] Permitir override manual del XP por parte del usuario (opcional).

### 2.2 Retroalimentación Motivacional con IA (RF-13)
- [ ] Crear `motivation_service.py` que genere mensajes personalizados según:
  - Racha actual del usuario.
  - Porcentaje de cumplimiento semanal.
  - Logros recientes desbloqueados.
  - Tiempo desde última actividad (para re-engagement).
- [ ] Implementar endpoint `GET /api/motivation` que devuelva un mensaje contextual.
- [ ] Diseñar prompt de generación de mensajes motivacionales en español.
- [ ] Integrar mensajes en la pantalla Home del frontend (banner o card motivacional).
- [ ] Cachear mensajes para no llamar a la API en cada visita (TTL de 4-6 horas).

### Entregables Fase 2:
- ✅ Al crear un hábito, la IA analiza su descripción y asigna dificultad/XP dinámicamente.
- ✅ La pantalla principal muestra mensajes motivacionales personalizados.
- ✅ La rúbrica de Maslow está documentada y funcional.

---

## Fase 3 — Funcionalidades Sociales
**Objetivo:** Implementar la dimensión social de la app (RF-14).
**Duración estimada:** 3-4 días
**Dependencia:** Fase 1 (logros visibles) + Fase 2 (XP dinámico funcionando).

### 3.1 Visualización de Progreso de Otros Usuarios
- [ ] Crear endpoint `GET /api/leaderboard` que devuelva ranking de usuarios por XP/racha.
- [ ] Implementar pantalla de Leaderboard en el frontend.
- [ ] Permitir ver el perfil público de otros usuarios (nombre, nivel, racha, logros).
- [ ] Respetar privacidad: solo mostrar lo que el usuario haya configurado como público.

### 3.2 Rachas Compartidas (Shared Streaks)
- [ ] Diseñar modelo de datos para rachas compartidas:
  - Tabla `shared_streaks`: id, nombre, creador_id, fecha_creación.
  - Tabla `shared_streak_members`: id, shared_streak_id, user_id, fecha_unión.
- [ ] Crear endpoints CRUD para rachas compartidas:
  - `POST /api/shared-streaks` (crear).
  - `GET /api/shared-streaks` (listar las del usuario).
  - `POST /api/shared-streaks/:id/join` (unirse).
  - `GET /api/shared-streaks/:id` (detalle con progreso de miembros).
- [ ] Implementar lógica: la racha compartida se mantiene mientras **todos** los miembros cumplan al menos 1 hábito diario.
- [ ] Crear UI en el frontend para crear, unirse y visualizar rachas compartidas.

### Entregables Fase 3:
- ✅ Los usuarios pueden ver un ranking/leaderboard.
- ✅ Los usuarios pueden crear y unirse a rachas compartidas.
- ✅ El progreso social es visible y motivante.

---

## Fase 4 — Modo Offline y Notificaciones
**Objetivo:** Hacer la app resiliente sin conexión y proactiva con recordatorios (RNF-03, RNF-04, RNF-11, RF-15).
**Duración estimada:** 4-5 días
**Dependencia:** Fases 1-3 (todas las funcionalidades core deben existir antes de replicarlas offline).

### 4.1 Modo Offline (RNF-03, RNF-04, RNF-11)
- [ ] Implementar almacenamiento local con `localStorage` o `IndexedDB` para:
  - Lista de hábitos activos del usuario.
  - Check-ins pendientes realizados sin conexión.
  - Datos de perfil y racha actual.
- [ ] Crear un **Service Worker** (o usar Capacitor Storage) para cachear datos esenciales.
- [ ] Implementar cola de sincronización:
  - Los check-ins hechos offline se guardan localmente con timestamp.
  - Al detectar conexión, se envían al backend en orden cronológico.
  - Manejar conflictos (ej: check-in ya existente en servidor).
- [ ] Completar la lógica de `sync_service.py` y `sync_routes.py` en el backend para recibir datos en lote.
- [ ] Indicador visual en la app que muestre estado de conexión (online/offline/sincronizando).

### 4.2 Notificaciones Push y Recordatorios (RF-15)
- [ ] Configurar Capacitor Push Notifications para Android.
- [ ] Implementar recordatorios locales:
  - El usuario puede configurar hora de recordatorio por hábito.
  - Notificaciones locales usando `@capacitor/local-notifications`.
- [ ] Crear tabla `notification_preferences` en el backend:
  - `user_id`, `habit_id`, `hora_recordatorio`, `activo`.
- [ ] UI en la pantalla de detalle del hábito para activar/configurar recordatorios.
- [ ] (Opcional/futuro) Notificaciones push desde servidor para re-engagement.

### Entregables Fase 4:
- ✅ La app funciona sin internet para las funciones básicas.
- ✅ Los datos se sincronizan automáticamente al recuperar conexión.
- ✅ El usuario recibe recordatorios de sus hábitos.

---

## Fase 5 — Pulido, Testing y Preparación para Entrega
**Objetivo:** Calidad final, rendimiento, pruebas exhaustivas y empaquetado.
**Duración estimada:** 2-3 días
**Dependencia:** Todas las fases anteriores.

### 5.1 Pruebas Finales de Integración
- [ ] Ejecutar y completar suite de pruebas del backend (`pytest`).
- [ ] Verificar cobertura de pruebas del frontend (unit + integration).
- [ ] Crear pruebas E2E que cubran los flujos completos:
  - Registro → Crear hábito → Check-in → Ver racha → Ver logro.
  - Pomodoro → Completar sesión → XP actualizado.
  - Validación IA → Foto → Aprobación → XP bonus.
  - Offline → Check-in → Reconexión → Sincronización.

### 5.2 Optimización de Rendimiento (RNF-02)
- [ ] Medir tiempos de carga de pantallas principales (Home, Hábitos, Perfil, Stats).
- [ ] Optimizar queries del backend (lazy loading, paginación si es necesario).
- [ ] Implementar carga diferida (lazy loading) de componentes pesados en el frontend.
- [ ] Comprimir assets y optimizar imágenes.

### 5.3 Build Android y Pruebas en Dispositivo (RNF-01, RNF-09)
- [ ] Ejecutar `npx cap sync` y generar APK/AAB para Android.
- [ ] Probar en emulador Android 8.0+ y en al menos 2 dispositivos reales.
- [ ] Verificar que no hay cierres inesperados (RNF-09).
- [ ] Documentar cualquier bug encontrado y corregir.

### 5.4 Documentación Final
- [ ] Actualizar `documentation.md` y `README.md` con todas las nuevas funcionalidades.
- [ ] Documentar los endpoints nuevos de la API.
- [ ] Actualizar el documento de Practicum I si es necesario.
- [ ] Preparar video demo actualizado con todas las funcionalidades.

### Entregables Fase 5:
- ✅ Suite de pruebas completa y pasando.
- ✅ App rápida y sin crashes.
- ✅ APK funcional para Android 8.0+.
- ✅ Documentación actualizada y lista para entrega.

---

## Resumen del Plan

| Fase | Nombre | Duración | RFs que cubre | RNFs que cubre |
|:----:|--------|:--------:|:-------------:|:--------------:|
| 1 | Cimientos y Brechas Básicas | 3-4 días | RF-14 (parcial), RF-17 | RNF-07 |
| 2 | IA Avanzada | 3-4 días | RF-12, RF-13 | — |
| 3 | Social | 3-4 días | RF-14 (completo) | — |
| 4 | Offline y Notificaciones | 4-5 días | RF-15 | RNF-01, RNF-03, RNF-04, RNF-11 |
| 5 | Pulido y Entrega | 2-3 días | — | RNF-02, RNF-08, RNF-09 |

---

## Diagrama de Dependencias entre Fases

```
┌─────────┐
│ FASE 1  │ ← Punto de partida obligatorio
│Cimientos│
└────┬────┘
     │
     ├──────────────────┐
     ▼                  ▼
┌─────────┐       ┌─────────┐
│ FASE 2  │       │ FASE 3  │  ← Pueden avanzar en paralelo
│   IA    │       │ Social  │
└────┬────┘       └────┬────┘
     │                 │
     └────────┬────────┘
              ▼
        ┌─────────┐
        │ FASE 4  │  ← Requiere features completos para replicar offline
        │ Offline │
        └────┬────┘
             ▼
        ┌─────────┐
        │ FASE 5  │  ← Cierre total
        │ Polish  │
        └─────────┘
```

> [!TIP]
> **Estrategia recomendada:** Completar la Fase 1 como prioridad absoluta, luego dividir el equipo para trabajar Fases 2 y 3 en paralelo, y finalmente cerrar con Fases 4 y 5 de forma secuencial.
