# Análisis del Estado del Proyecto StreakUp
### Fecha de análisis: 29/04/2026
### Documento de referencia: Practicum I.md

---

## Resumen Ejecutivo

Este documento presenta el resultado del análisis cruzado entre los requerimientos definidos en el documento **Practicum de Sistemas I** y el estado real del código fuente del proyecto StreakUp (backend + frontend). Cada requerimiento funcional (RF) y no funcional (RNF) se clasifica en tres estados:

| Estado | Significado |
|--------|-------------|
| ✅ Completado | Implementado y funcional en backend y/o frontend |
| 🚧 Parcial | Tiene código base pero le falta integración, UI o lógica completa |
| ❌ Pendiente | Sin implementación funcional o marcado explícitamente como tarea futura |

---

## 1. Requerimientos Funcionales

### ✅ Completados

| ID | Descripción | Evidencia en código |
|----|-------------|---------------------|
| RF-01 | Registro de usuarios con credenciales seguras | `auth_routes.py`, `auth_service.py`, JWT |
| RF-02 | Inicio y cierre de sesión | `auth_routes.py`, tokens JWT, frontend `(auth)/` |
| RF-03 | Gestión del perfil (nivel, XP, estadísticas) | `user_routes.py`, `stats_service.py`, `xp_service.py`, frontend `profile/` |
| RF-04 | Creación de hábitos personalizados | `habit_routes.py`, `habit_service.py`, frontend `habits/` |
| RF-05 | Edición y eliminación de hábitos | `habit_routes.py` (PUT/DELETE), `habit_service.py` |
| RF-06 | Frecuencia configurable (diaria, semanal, días específicos) | `habit_service.py`, modelo `UserHabit` con campos de frecuencia |
| RF-07 | Categorización de hábitos | Modelo `Categoria`, relación `Categorias → Habitos` (1:N) |
| RF-08 | Marcar hábitos como completados (check-in diario) | `checkin_routes.py`, `checkin_service.py` |
| RF-09 | Historial de hábitos completados | Modelo `CheckIn`, `Registro_Habitos` (1:N desde UserHabit) |
| RF-10 | Cálculo de rachas (streaks) consecutivas | `streak_service.py`, `compute_current_streak()` |
| RF-11 | Asignación de XP al completar hábitos | `xp_service.py`, `award_xp()`, integrado en check-ins y validaciones |
| RF-16 | Temporizador tipo Pomodoro | `pomodoro_routes.py`, `pomodoro_service.py`, frontend `pomodoro/` |
| RF-18 | Registro automático de sesión Pomodoro completada | `pomodoro_service.py` registra sesión como progreso |
| RF-19 | XP adicional por completar sesiones de enfoque | Integrado en `pomodoro_service.py` |

### 🚧 Parcialmente Implementados

| ID | Descripción | Estado actual | Faltante |
|----|-------------|---------------|----------|
| RF-14 | Visualización de progreso propio y de otros usuarios, rachas compartidas | El progreso individual funciona (stats, perfil, XP). Rutas de estadísticas existen (`stats_routes.py`, `stats_service.py`). | **Vista social**: no hay endpoints para ver progreso de otros usuarios. **Rachas compartidas**: sin modelo ni lógica. Falta UI de leaderboard/social. |
| RF-17 | Animaciones dinámicas del paso del tiempo (llama, vela, hielo, reloj de arena) | Existe vista de Pomodoro funcional en frontend. | Las animaciones visuales específicas por modo (Fuego, Planta, Luna) están en diseño Figma pero no implementadas con fidelidad completa en el frontend. |
| — | Integración completa Frontend ↔ Backend | Funcionalidades principales conectadas. Servicios de comunicación creados (`services/`). | Ajustes de manejo de errores de red, sincronización robusta, pruebas de flujo completo E2E. |
| — | Sistema de logros (Achievements/Badges) | Backend tiene `achievement_service.py` con `evaluate_and_award()` y `achievement_routes.py`. | Falta la **interfaz visual** en frontend para mostrar medallas, notificaciones de logro desbloqueado, y pantalla de colección de logros. |

### ❌ Pendientes

| ID | Descripción | Detalle |
|----|-------------|---------|
| RF-12 | IA para calcular dificultad basada en Pirámide de Maslow | `difficulty_service.py` es un **placeholder vacío**. No existe lógica de análisis de descripción del hábito ni rúbrica de Maslow. Requiere diseño de rúbrica + integración con LLM. |
| RF-13 | Retroalimentación motivacional con IA según progreso | La IA actual solo valida fotos (válida/inválida). No genera frases motivacionales personalizadas basadas en el historial o progreso del usuario. |
| RF-15 | Notificaciones push y recordatorios para hábitos activos | Sin implementación. Requiere integración con Capacitor Push Notifications o sistema de recordatorios locales. |

---

## 2. Requerimientos No Funcionales

### ✅ Cumplidos o en buen estado

| ID | Categoría | Estado |
|----|-----------|--------|
| RNF-05 | Seguridad: Autenticación segura | ✅ JWT implementado con Flask-JWT-Extended |
| RNF-06 | Seguridad: Credenciales cifradas | ✅ Hashing de contraseñas, `.env` para secretos |
| RNF-10 | Usabilidad: Interfaz intuitiva | ✅ Navegación clara con Next.js App Router, componentes reutilizables |
| RNF-12 | Privacidad/Legal: Protección de datos | ✅ Datos sensibles en `.env`, no expuestos al cliente |
| RNF-13 | Responsive: Adaptación a pantallas | ✅ Tailwind CSS con diseño responsive |
| RNF-14 | Mantenibilidad: Actualizaciones sin pérdida de datos | ✅ Sistema de migraciones con Flask-Migrate |
| RNF-15 | Escalabilidad: Soporte a más usuarios | ✅ Arquitectura modular, posibilidad de migrar a Supabase |

### 🚧 Parciales

| ID | Categoría | Estado |
|----|-----------|--------|
| RNF-02 | Rendimiento: Carga < 3 segundos | 🚧 No se han hecho benchmarks formales de tiempo de carga |
| RNF-09 | Confiabilidad: Sin cierres inesperados | 🚧 Error handling existe pero necesita pruebas E2E exhaustivas |

### ❌ Pendientes

| ID | Categoría | Estado |
|----|-----------|--------|
| RNF-01 | Compatibilidad: Android 8.0+ | ❌ Capacitor configurado pero sin pruebas en dispositivos reales |
| RNF-03 | Offline: Funciones básicas sin internet | ❌ Sin service worker ni almacenamiento local para modo offline |
| RNF-04 | Sincronización offline → online | ❌ `sync_routes.py` y `sync_service.py` son placeholders mínimos |
| RNF-07 | Eliminación de cuenta desde perfil | ❌ No se encontró endpoint ni UI para eliminar cuenta |
| RNF-08 | Disponibilidad 95% | ❌ Requiere despliegue en producción y monitoreo |
| RNF-11 | Integridad ante pérdida de conexión/cierre forzado | ❌ Ligado a RNF-03/RNF-04, requiere implementación offline-first |

---

## 3. Funcionalidades Transversales

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Validación por IA (Fotos) | ✅ | OpenAI Vision integrado (`openai_service.py`) |
| Validación por texto | ✅ | Implementado en `validation_service.py` |
| Validación por tiempo | ✅ | Implementado en `validation_service.py` |
| XP con multiplicador por validación IA | ✅ | `_apply_approved_progress()` aplica x1.5 |
| Pruebas Backend (Unit/Integration) | ✅ | Suite completa en `backend/tests/` |
| Pruebas Frontend (Unit/Integration/E2E) | 🚧 | Estructura existe en `frontend/tests/` pero cobertura por verificar |
| Empaquetado Android con Capacitor | 🚧 | Dependencia configurada, falta build y prueba en dispositivo real |
| Documentación técnica | ✅ | `documentation.md`, `technical-writer.md`, `README.md` |

---

## 4. Resumen Cuantitativo

| Categoría | Completado | Parcial | Pendiente | Total |
|-----------|:----------:|:-------:|:---------:|:-----:|
| **RF (Funcionales)** | 14 | 4 | 3 | 21 |
| **RNF (No Funcionales)** | 7 | 2 | 6 | 15 |
| **Total** | **21** | **6** | **9** | **36** |

> **Progreso general estimado: ~65-70%**
>
> El núcleo funcional (autenticación, CRUD de hábitos, check-ins, rachas, XP, Pomodoro, validación IA por foto) está sólido. Las principales brechas son: funcionalidades sociales (RF-14), dificultad con Maslow (RF-12), mensajes motivacionales (RF-13), notificaciones (RF-15) y el ecosistema offline (RNF-03/04/11).
