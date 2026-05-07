# Documentación de StreakUp

Esta documentación tiene el objetivo de explicar el funcionamiento del código de StreakUp de forma sencilla, clara y general. Sirve como una guía para comprender cómo están estructuradas las distintas partes del proyecto y por qué se han implementado ciertas prácticas.

---

## 1. Backend (Lógica del Servidor y Base de Datos)
La carpeta `backend` contiene el "cerebro" de la aplicación. Aquí es donde se guardan los datos, se verifica que los usuarios sean quienes dicen ser y se gestiona la lógica central, como calcular los puntos de experiencia (XP) o validar evidencias con IA.

*   **Lenguaje y Framework Principal:** Usamos **Python** apoyado en el framework **Flask**. Flask nos permite crear un servidor web de forma ligera y rápida.
*   **Base de Datos y Modelos:** Utilizamos **SQLAlchemy**, que es una herramienta que nos permite hablar con la base de datos usando código de Python en lugar de tener que escribir consultas complejas. De este modo, manejamos fácilmente tablas para `Usuarios`, `Hábitos`, `Check-ins`, entre otros.
*   **Archivos de Entorno (`.env`):** Un archivo crucial en esta carpeta es el `.env`. Nunca subimos este archivo a lugares públicos porque contiene "secretos", como contraseñas de la base de datos, claves para la autenticación (JWT) y llaves de APIs (como las de OpenAI). Sirve para que la aplicación local sepa cómo conectarse a otros servicios sin comprometer la seguridad.
*   **Endpoints (Rutas):** Los endpoints son las "puertas" que el Backend deja abiertas para que el Frontend (la vista) se comunique con él. Tenemos distintas categorías de rutas divididas modularmente:
    *   **Auth (`auth_routes.py`):** Puertas para registrar usuarios e iniciar sesión de forma segura.
    *   **Habits (`habit_routes.py`):** Crear, leer, editar y borrar hábitos.
    *   **Check-ins y Validación (`checkin_routes.py`, `validation_routes.py`):** Registrar el cumplimiento diario de un hábito y validar evidencias de fotos/texto asegurando que sea real con ayuda de Inteligencia Artificial.
    *   **Otras utilidades:** Estadísticas, sistema Pomodoro, y recuperación de perfil de usuario.

---

## 2. Frontend (Interfaz de Usuario)
La carpeta `frontend` contiene todo lo que el usuario ve e interactúa directamente. Es la "cara" de la aplicación. En StreakUp apostamos por una interfaz moderna, dinámica y que incentiva a los usuarios visualmente.

*   **Lenguaje y Framework Principal:** Usamos **TypeScript** base y **Next.js** (que es un framework superpotente montado sobre React). Next.js nos brinda navegación veloz y mejores optimizaciones.
*   **Apariencia y Estilos:** Para el diseño aplicamos **Tailwind CSS**, una herramienta de utilidades de diseño que nos permite crear estilos modernos y personalizados eficientemente sin escribir CSS complicado desde cero.
*   **Estructura y Organización:**
    *   **Componentes (`components/`):** Son piezas de Lego (botones, tarjetas, formularios). En lugar de escribir el código del botón cada vez que lo necesitamos, creamos un solo "Componente Botón" que reutilizamos constantemente.
    *   **Servicios (`services/`):** Son los "mensajeros" de la aplicación. Su única función es tomar datos que recolectamos en pantalla (por ejemplo, el email y contraseña) y mandarlos al Backend a través de los **Endpoints**. Así mantenemos separada la lógica visual de la lógica de comunicación red.
    *   **Estado y Características (`state/` y `features/`):** Aquí manejamos la memoria a corto plazo de la app (ej. ¿el usuario ya inició sesión?, ¿cuáles son sus hábitos de hoy?) para que la aplicación reaccione instantáneamente al interactuar.
*   **Aplicación Móvil:** Usamos dependencias como **Capacitor** que nos permite tomar toda esta web que hemos construido y "empaquetarla" para que funcione como una aplicación nativa instalable en Android.

---

## 3. Pruebas y Buenas Prácticas (Testing)
Una gran parte de que StreakUp sea robusto y libre de fallos es nuestra cultura de validación. Antes de lanzar modificaciones mayores, el código se somete a varias pruebas automáticas (`tests`):

### Pruebas en el Backend (`backend/tests/`)
*   **Pruebas de Flujo de Autenticación (`test_auth_flow.py`):** Comprueban simulando el comportamiento de un usuario si el inicio de sesión y validación de sesiones funciona correctamente y sin brechas de seguridad.
*   **Pruebas de Consistencia de XP (`test_xp_consistency.py`):** Verifican la lógica matemática detrás de tu recompensa y experiencia, así el sistema no te da puntos de más (errores lógicos) o de menos por completar tareas.
*   **Pruebas de Preparación Operativa / Migración:** Estas aseguran que, si movemos la base de datos a un servicio en la nube (como Supabase) o hacemos cambios estructurales en las tablas, no se pierda la información existente.
*   **Seguridad de Tiempo de Ejecución (`test_runtime_security.py`):** Nos ayudan a validar que estamos evitando ataques comunes y asegurando las peticiones y validaciones debidas.

### Pruebas en el Frontend (`frontend/tests/`)
*   Se divide en tres enfoques para poder atrapar errores visuales y de interacción:
    *   **Unit (Unitarias):** Pruebas de bajo nivel que se centran en revisar que un componente individual (como una sola función matemática o un botón) funcione.
    *   **Integration (Integración):** Validan que dos o más módulos interactúen de forma correcta (por ejemplo, que hacer click en un botón llame correctamente al servicio que inicia sesión).
    *   **E2E (End to End - Extremo a Extremo):** Ensayos que simulan a un usuario real que abre el programa, hace clics en la pantalla y espera un flujo normal para así asegurar el funcionamiento completo generalizado.

**Conclusión:**  
Ambos lados (Backend y Frontend) están comunicados eficientemente y su separación de responsabilidades, sumado a una suite de pruebas comprensiva, asegura un producto altamente estable, bien diseñado y listo para escalabilidad y evolución continua.
