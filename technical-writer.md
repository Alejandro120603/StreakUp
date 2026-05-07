# Guía: Flujo de Validación de Imágenes con IA en StreakUp

Esta breve guía explica para el equipo de desarrollo y producto cómo funciona internamente el sistema de validación de fotos para los hábitos, y bajo qué criterios opera la inteligencia artificial.

## 1. El Flujo de Validación (Paso a Paso)

Cuando un usuario sube una foto para completar su hábito, sucede lo siguiente en el Backend:

1. **Recepción y Verificación Previa:**
   - La imagen llega en formato Base64 a nuestro servicio (`validation_service`).
   - El sistema comprueba que el usuario no haya validado ese mismo hábito hoy (evitando _farming_ de experiencia).
   - Se asegura de que la imagen sea menor a 10 MB y tenga un formato soportado (JPEG, PNG o WEBP).

2. **Análisis con Inteligencia Artificial:**
   - La imagen es enviada a la API de **OpenAI Vision (`gpt-4o-mini`)** de forma privada.
   - Junto a la imagen, le enviamos el *nombre real del hábito* que el usuario está intentando completar.

3. **Respuesta y Conclusión:**
   - La IA devuelve una valoración en formato JSON puro.
   - Si se considera `valido = true`, el sistema registra el *Check-in* del día bajo este método de validación.
   - El jugador recibe un **multiplicador de experiencia (1.5x)** de los XP base por usar evidencia fotográfica en lugar de solo marcar el hábito como "Hecho".
   - Por último, la decisión y sus detalles se guardan en la tabla de auditoría (`ValidationLog`).

---

## 2. Criterios de la IA y "Prompt" del Sistema

Nuestra Inteligencia Artificial no es punitiva en exceso. Está configurada bajo el modelo `gpt-4o-mini` con una "temperatura baja" (`0.2`), lo que significa que sus respuestas son predecibles y enfocadas.

**Las 2 reglas principales que rigen la decisión de la IA son:**

*   **Evidencia Razonable:** La IA es instruida explícitamente para *determinar si la imagen muestra evidencia razonable de que la persona está realizando o ha realizado el hábito indicado.*
*   **Flexibilidad Honesta:** La orden clave en el sistema operativo de la IA es: *"Sé flexible pero honesto"*. Esto significa que no se requiere una foto perfecta de calidad estudio. Sin embargo, complementa indicando: *"Si la imagen no tiene relación, marca como inválido."*

**¿Qué datos obtenemos de vuelta tras un análisis?**
Por cada validación, guardamos en la base de datos lo siguiente:
1. `valido` (Booleano): True o False, indica si se aceptó o rechazó.
2. `razon` (Texto): Una pequeña oración de la IA justificando internamente el porqué de su decisión. 
3. `confianza` (Número 0 al 1): Nivel de certeza de la red neuronal sobre la decisión tomada.

---

## 3. ¿Cómo funcionan nuestros Endpoints (APIs)?

Para que el equipo del Frontend pueda interactuar con los datos (crear hábitos, subir fotos, iniciar sesión), el Backend expone **Endpoints** (también conocidos como rutas o APIs).

**¿Qué es un Endpoint conceptualmente?**
Imagina que el Backend es una oficina cerrada al público, y los Endpoints son las "ventanillas" exclusivas donde puedes entregar o solicitar documentos. Cada ventanilla tiene una función y reglas específicas:

*   **Método (Verbo HTTP):** Define qué intención tenemos al acercarnos a la ventanilla:
    *   `GET`: Para pedir información (ej. "Dame mi lista de hábitos de hoy").
    *   `POST`: Para enviar o crear nueva información (ej. "Toma esta foto y valida mi hábito" o "Crea una cuenta nueva").
    *   `PUT` / `PATCH`: Para modificar datos existentes (ej. "Cambia el color de este hábito a azul").
    *   `DELETE`: Para eliminar información (ej. "Borra este hábito").
*   **Ruta (URL):** Es el nombre o número específico de la ventanilla, por ejemplo, `/api/habits` para gestionar hábitos, o `/api/auth/login` para iniciar sesión.
*   **Carga y Seguridad (Body / Headers):** Al hablar por la ventanilla mediante un método `POST`, solemos entregar información empaquetada (generalmente en formato **JSON**). Además, en la mayoría de nuestras ventanillas necesitamos presentar nuestro "gafete", que es el **Token JWT** provisto en los Headers (*Cabeceras*). Esto demuestra de manera segura quiénes somos y nos da permiso de operar.

En StreakUp, las rutas se dividen organizadamente por temática dentro de `backend/app/routes/` (e.g. `habit_routes.py`, `validation_routes.py`). Al llamar a alguna de ellas desde el Frontend (o nuestra app móvil), el Backend valida tus permisos de seguridad, procesa las acciones correspondientes usando la base de datos, y finalmente responde con datos en JSON y un código de estado (ej. `200 OK` si todo salió bien, o `401 Unauthorized` si tu sesión caducó).
