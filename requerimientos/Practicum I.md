### 




Materia

Practicum de sistemas I: ingeniería de proyectos

 Fecha de Entrega

17/04/2026

## **Objetivo general:**

* Desarrollar una aplicación móvil que permita fomentar el seguimiento de hábitos como una experiencia social, así como el control, seguimiento y fortalecimiento de hábitos personales, mediante el uso de tecnología, motivación gamificada e inteligencia artificial, con el fin de mejorar la constancia, el bienestar y la productividad del usuario.

## **Objetivos específicos:**

* Diseñar e implementar un módulo de creación de rutinas personalizadas que permita al usuario configurar hábitos según tiempo disponible, frecuencia y categoría, logrando que al menos el 80% de los usuarios en fase piloto creen una rutina completa (mínimo 3 hábitos activos) durante su primera semana de uso.

## **Requerimientos Funcionales**

| ID | Explicación | Dependencias | Prioridad | Sprint |
| ----- | ----- | ----- | ----- | :---: |
| RF-01 | StreakUp debe permitir el registro de usuarios mediante credenciales seguras. | — | Alta | 4 |
| RF-02 | El sistema debe permitir el inicio y cierre de sesión de usuarios registrados. | RF-01 | Alta | 4 |
| RF-03 | El sistema debe permitir la gestión del perfil del usuario, mostrando nivel, XP y estadísticas. | RF-02 | Alta | 5 |
| RF-04 | El sistema debe permitir la creación de hábitos personalizados por parte del usuario. | RF-02 | Alta | 5 |
| RF-05 | El sistema debe permitir editar y eliminar hábitos existentes. | RF-04 | Alta | 5 |
| RF-06 | El sistema debe permitir configurar la frecuencia de los hábitos (diaria, semanal o días específicos). | RF-04 | Media | 5 |
| RF-07 | El sistema debe permitir categorizar hábitos (hacer ejercicio, estudiar, leer, practicar una disciplina artística, escribir un diario). | RF-04 | Media  | 5 |
| RF-08 | El sistema debe permitir al usuario marcar hábitos como completados diariamente. | RF-04 | Alta | 5 |
| RF-09 | El sistema debe registrar el historial de hábitos completos del usuario. | RF-08 | Media | 5 |
| RF-10 | El sistema debe calcular rachas (streaks) de hábitos cumplidos de forma consecutiva. | RF-08 | Alta | 5 |
| RF-11 | El sistema debe asignar puntos de experiencia (XP) al completar hábitos. | RF-08 | Alta | 5 |
| RF-12 | El sistema debe utilizar inteligencia artificial para analizar la descripción del hábito y calcular su dificultad, asignando puntos de forma dinámica, en base a una rúbrica determinada basada en la pirámide de Maslow. | RF-04 | Alta | 6 |
| RF-13 | El sistema debe generar retroalimentación motivacional (frases y mensajes) según el progreso del usuario. | RF-11 | Media |  |
| RF-14 | El sistema debe permitir la visualización del progreso del usuario y otros usuarios, mediante niveles, puntos y rachas. Además de incluir rachas compartidas. | RF-11 | Alta |  |
| RF-15 | El sistema debe permitir la configuración de notificaciones y recordatorios para hábitos activos. | RF-04 | Media |  |
| RF-16 | El sistema debe permitir al usuario iniciar sesiones de enfoque mediante un temporizador tipo Pomodoro. |  |  |  |
| RF-17 | El sistema debe representar visualmente el paso del tiempo mediante animaciones dinámicas (llama, vela, hielo o reloj de arena). |  |  |  |
| RF-18 | El sistema debe registrar automáticamente la sesión completada como parte del progreso del usuario. |  |  |  |
| RF-19 | El sistema debe asignar puntos de experiencia adicionales por completar sesiones de enfoque sin interrupciones. |  |  |  |

## **Requerimientos No Funcionales**

| ID | Categoría | Requerimiento | Relevancia |
| ----- | ----- | ----- | ----- |
| RNF-01 | Compatibilidad | La aplicación debe ser compatible con dispositivos Android versión 8.0 o superior. | Medio |
| RNF-02 | Rendimiento / UX | Las pantallas principales (inicio, lista de hábitos y perfil) deben cargar en un tiempo máximo de 3 segundos en condiciones normales de red. | Alto |
| RNF-03 | Usabilidad / Accesibilidad | La aplicación debe permitir el uso de funciones básicas sin conexión a internet, considerando como funciones básicas: visualizar hábitos, marcar hábitos como completados, consultar rachas y ver el progreso local del usuario. | Alto |
| RNF-04 | Confiabilidad / UX | Los datos registrados en modo offline deben almacenarse localmente y sincronizarse automáticamente cuando se recupere la conexión a internet. | Alto |
| RNF-05 | Seguridad | El acceso a la aplicación debe estar protegido mediante autenticación segura. | Alto |
| RNF-06 | Seguridad / Privacidad | Las credenciales del usuario deben almacenarse de forma segura mediante mecanismos de cifrado. | Alto |
| RNF-07 | Usabilidad | La aplicación debe permitir al usuario eliminar su cuenta y su información de forma clara y accesible desde el perfil. | Medio |
| RNF-08 | Disponibilidad | El sistema debe mantener una disponibilidad mínima del 95% durante su uso normal. | Medio |
| RNF-09 | Confiabilidad | La aplicación no debe presentar cierres inesperados durante su uso normal en condiciones estándar del dispositivo. | Alto |
| RNF-10 | Usabilidad / Accesibilidad | La interfaz del sistema debe ser intuitiva, con iconos comprensibles, textos legibles y navegación clara para usuarios sin conocimientos técnicos. | Alto |
| RNF-11 | Confiabilidad / UX | El sistema debe garantizar la integridad de los datos ante: pérdida de conexión a internet, cierre forzado de la aplicación y apagado del dispositivo por batería baja, asegurando que el progreso registrado no se pierda. | Alto |
| RNF-12 | Privacidad / Legal | El sistema debe cumplir con las normas básicas de protección de datos personales del usuario. | Alto |
| RNF-13 | Usabilidad / Accesibilidad | La aplicación debe adaptarse correctamente a diferentes resoluciones y tamaños de pantalla sin afectar la legibilidad ni la navegación. | Medio |
| RNF-14 | Mantenibilidad | El sistema debe permitir actualizaciones sin afectar la información almacenada del usuario. | Medio |
| RNF-15 | Escalabilidad | El sistema debe soportar un aumento progresivo de usuarios sin degradar perceptiblemente el rendimiento de la aplicación. | Alto |

## **Diagrama de Casos de Uso**

![][image1]

## **Usuario**

El usuario es el actor principal del sistema. Puede:

* Autenticarse en la aplicación para acceder a las funcionalidades.  
* Registrarse como nuevo usuario en caso de no contar con una cuenta previa.  
* Gestionar hábitos, creando, editando y seleccionando hábitos personales.  
* Marcar hábitos como completados para registrar su cumplimiento diario.  
* Subir evidencia del hábito como respaldo de su cumplimiento.  
* Personalizar la experiencia de uso de la aplicación según sus preferencias.  
* Visualizar su progreso, incluyendo rachas, puntos y desempeño general.

## **Dispositivo**

El dispositivo móvil actúa como un actor de soporte técnico. Puede:

* Abrir la cámara o galería del dispositivo.  
* Capturar evidencia multimedia (imagen).  
* Proporcionar la evidencia al sistema para su posterior análisis.

## **Inteligencia Artificial (IA)**

La inteligencia artificial es responsable de los procesos automáticos del sistema. Puede:

* Analizar la evidencia enviada por el usuario para validar el cumplimiento del hábito.  
* Generar mensajes motivacionales personalizados con base en el desempeño del usuario.

**Link:** https://lucid.app/lucidchart/0e1d9ccc-5844-4d2f-853a-407234fa10ff/edit?invitationId=inv\_f55e9479-bbac-4b51-8dcf-30a83bfce2ca\&page=0\_0\#

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **Diagrama de Actividades**

**![][image2]**  
**Link del diagrama:**   
[https://lucid.app/lucidchart/6fce6691-1635-4c33-8006-383b35693f07/edit?viewport\_loc=-669%2C1092%2C2806%2C1402%2CHWEp-vi-RSFO\&invitationId=inv\_6c82c8df-b11b-4932-879a-cb4703810a20](https://lucid.app/lucidchart/6fce6691-1635-4c33-8006-383b35693f07/edit?viewport_loc=-669%2C1092%2C2806%2C1402%2CHWEp-vi-RSFO&invitationId=inv_6c82c8df-b11b-4932-879a-cb4703810a20) 

## **Modelo E-R**

![][image3]

[https://lucid.app/lucidchart/b91d628a-e941-4cff-8235-8c19bf26dbee/edit?viewport\_loc=-1801%2C-3524%2C2726%2C1412%2C0\_0\&invitationId=inv\_8244c560-385b-43ed-847b-64b090d8498e](https://lucid.app/lucidchart/b91d628a-e941-4cff-8235-8c19bf26dbee/edit?viewport_loc=-1801%2C-3524%2C2726%2C1412%2C0_0&invitationId=inv_8244c560-385b-43ed-847b-64b090d8498e)

Relaciones:

### **Usuarios — Habito\_Usuario**

**Relación:** 1 a N

* Un usuario puede activar muchos hábitos.  
* Cada registro en `hábito usuario` pertenece a un solo usuario.

Un usuario puede tener múltiples hábitos activos o históricos.

### **Habitos — Habito\_Usuario**

**Relación:** 1 a N

* Un hábito del catálogo puede estar asignado a muchos usuarios.  
* Cada registro en `habito_usuario` corresponde a un solo hábito.

Un mismo hábito puede ser usado por muchos usuarios.

### **Categorias — Habitos**

**Relación:** 1 a N

* Una categoría puede tener muchos hábitos.  
* Cada hábito pertenece a una sola categoría.

Los hábitos están organizados dentro de categorías.

### **Habito\_Usuario — Registro\_Habitos**

**Relación:** 1 a N

* Un hábito activado por un usuario puede tener muchos registros diarios.  
* Cada registro diario pertenece a un solo hábito activado.

Un usuario puede marcar el mismo hábito muchas veces (uno por día).

### **Niveles — Usuarios (Relación lógica, no física)**

No hay FK directa.

* Un usuario pertenece a un nivel según su XP acumulado.  
* Un nivel puede corresponder a muchos usuarios.

El nivel se calcula dinámicamente en el backend con base en `xp_usuario`.

## 

## 

## **Interfaces de Usuario**

## 

## 

## 

## 

1. **Splash**  
   Pantalla inicial donde aparece el logo de Streak Up. Define la identidad visual y genera una primera impresión limpia y minimalista.

2. **Login / Registro**  
   Permite al usuario crear una cuenta o iniciar sesión. Es una pantalla simple y directa, enfocada en acceso rápido.

3. **Home**  
   Pantalla principal de la aplicación. Muestra los hábitos activos y su crecimiento visual (Fuego, Planta o Luna). Aquí el usuario visualiza su progreso diario.

4. **Crear hábito**  
   Formulario para añadir un nuevo hábito. Solo permite seleccionar Fuego, Planta o Luna como representación visual, ya que estos se reflejan en la pantalla principal como indicador de crecimiento.

5. **Detalle del hábito**  
   Permite configurar cómo se medirá el hábito: tipo (Sí/No, Tiempo o Cantidad), frecuencia y objetivo. Define la lógica de seguimiento.

6. **Modo Pomodoro**  
   Pantalla de enfoque inmersivo. Permite configurar tiempo de estudio, tiempo de descanso y número de ciclos. El diseño cambia según el modo seleccionado.

7. **Finalización de sesión**  
   Se muestra cuando el usuario completa una sesión. Refuerza el logro y actualiza el progreso del hábito.

8. **Estadísticas**  
   Presenta información sobre racha, cumplimiento y evolución. Permite analizar el progreso a mediano y largo plazo.

9. **Perfil**  
   Sección de ajustes y personalización. Permite cambiar preferencias visuales, revisar logros y administrar la cuenta.

[https://www.figma.com/make/X3Axm5Y9K9FBegZ0DAs6FS/Streak-Up-Habit-Tracker?fullscreen=1\&t=lpIhdc9BMmWgB9p2-1\&preview-route=%2Fprofile](https://www.figma.com/make/X3Axm5Y9K9FBegZ0DAs6FS/Streak-Up-Habit-Tracker?fullscreen=1&t=lpIhdc9BMmWgB9p2-1&preview-route=%2Fprofile)

**Descripción de funcionalidades principales implementadas**

## **1\. Registro e inicio de sesión**

El sistema permite a los usuarios crear una cuenta y acceder a la aplicación mediante credenciales seguras. También incluye la opción de cerrar sesión, garantizando el control de acceso y la protección de la información.

## **2\. Gestión de perfil**

El usuario puede visualizar su información dentro de la aplicación, incluyendo nivel, puntos de experiencia (XP) y progreso general, lo que le permite monitorear su desempeño.

## **3\. Gestión de hábitos (CRUD)**

Se implementó un sistema completo que permite al usuario crear, editar, eliminar y consultar hábitos personalizados. Esto constituye el núcleo principal de la aplicación.

## **4\. Configuración de hábitos**

Cada hábito puede configurarse según su frecuencia (diaria, semanal), tipo (sí/no, tiempo o cantidad) y categoría, permitiendo adaptar el sistema a distintos objetivos personales.

## **5\. Registro diario de hábitos (check-ins)**

El usuario puede marcar manualmente los hábitos como completados. Esta acción genera un registro que se almacena como historial de actividad.

## **6\. Historial de hábitos**

El sistema almacena los registros diarios, permitiendo al usuario consultar su actividad pasada y dar seguimiento a su constancia.

## **7\. Sistema de rachas (streaks)**

Se implementó un sistema que calcula automáticamente los días consecutivos en los que un usuario cumple sus hábitos, incentivando la continuidad.

## **8\. Sistema de puntos de experiencia (XP)**

El sistema asigna puntos al completar hábitos, los cuales se acumulan y reflejan el progreso del usuario dentro de la aplicación.

## **9\. Visualización de estadísticas**

El usuario puede consultar métricas relacionadas con su progreso, como hábitos completados, rachas y nivel, lo que facilita el análisis de su desempeño.

## **10\. Modo Pomodoro**

Se desarrolló un temporizador funcional que permite al usuario realizar sesiones de enfoque. Al finalizar, el sistema registra automáticamente la sesión como parte del progreso.

## **11\. Interfaz de usuario y navegación**

Se implementaron las pantallas principales del sistema (inicio, hábitos, estadísticas y perfil), asegurando una navegación clara, organizada e intuitiva.

## **12\. Validación de evidencia con inteligencia artificial**

El sistema permite al usuario subir imágenes como evidencia del cumplimiento de un hábito. Estas son analizadas mediante inteligencia artificial para determinar si el hábito fue realizado.

## **13\. Asignación de XP adicional mediante IA**

Cuando la evidencia es validada correctamente, el sistema otorga un multiplicador adicional de puntos de experiencia, incentivando el uso de esta funcionalidad.

# **Video de las funcionalidades clave**

# Los videos presentados muestran el funcionamiento real de la aplicación StreakUp, evidenciando las principales funcionalidades implementadas dentro del sistema.

# En ellos se observa el proceso de acceso del usuario mediante registro e inicio de sesión, seguido de la interacción con la pantalla principal donde se visualizan los hábitos activos. También se demuestra la creación y gestión de hábitos, así como el registro diario de actividades mediante check-ins.

# Adicionalmente, se muestra el sistema de rachas y puntos de experiencia, los cuales se actualizan conforme el usuario cumple sus hábitos. En los videos también se evidencia el uso del modo Pomodoro, permitiendo registrar sesiones de enfoque dentro de la aplicación.

# Finalmente, se incluye la funcionalidad de validación mediante inteligencia artificial, donde el usuario puede subir evidencia visual para comprobar el cumplimiento de un hábito y recibir recompensas adicionales.

# Link: [https://drive.google.com/drive/folders/1aiRdG90vvGu5CBC5jYYrnBkWRDgh2Q0m?usp=drive\_link](https://drive.google.com/drive/folders/1aiRdG90vvGu5CBC5jYYrnBkWRDgh2Q0m?usp=drive_link)

# **Flujo de trabajo del usuario dentro del sistema**

El flujo inicia cuando el usuario accede a la aplicación mediante registro o inicio de sesión, lo que permite validar su identidad y cargar su información.

Una vez dentro, el usuario visualiza sus hábitos activos en la pantalla principal y puede crear o gestionar hábitos, configurando su frecuencia, tipo y categoría.

Durante el uso diario, el usuario marca los hábitos como completados mediante check-ins. Esta acción se registra en el sistema, actualizando automáticamente su historial, rachas y puntos de experiencia.

Adicionalmente, el usuario puede utilizar el modo Pomodoro para realizar sesiones de enfoque, las cuales se registran automáticamente como parte de su progreso.

En caso de requerir validación, el usuario puede subir evidencia visual (imágenes), la cual es analizada mediante inteligencia artificial para determinar el cumplimiento del hábito y, en su caso, otorgar recompensas adicionales.

Finalmente, el usuario puede consultar su progreso en la sección de estadísticas, donde se muestran métricas como rachas, cumplimiento y evolución general.

# **Funcionalidades aún en desarrollo**

## **Integración completa entre frontend y backend**

Actualmente, el sistema se encuentra en proceso de finalizar la integración total entre la aplicación (frontend) y el servidor (backend). Aunque las funcionalidades principales ya están implementadas, aún se están realizando ajustes para asegurar una comunicación estable, manejo correcto de errores y sincronización completa de datos.

Esta funcionalidad es clave para garantizar el correcto funcionamiento del sistema en un entorno real, ya que permitirá que todas las acciones del usuario se reflejen de manera eficiente y sin fallos.

# **Estrategia para completar funcionalidades restantes**

Para completar las funcionalidades restantes del sistema StreakUp, se seguirá una estrategia enfocada principalmente en finalizar la integración entre el frontend y el backend, ya que esta es la parte que aún requiere ajustes para asegurar el funcionamiento completo de la aplicación.

Primero, se revisará que las funciones principales, como gestión de hábitos, registro diario, rachas, puntos y validación con inteligencia artificial, se comuniquen correctamente con el servidor. En esta etapa también se corregirán posibles errores en el envío y recepción de datos.

Posteriormente, se realizan pruebas generales del sistema para comprobar que cada módulo funcione de manera estable y que la experiencia del usuario sea correcta durante el uso de la aplicación.

Finalmente, se harán ajustes finales de rendimiento, corrección de errores menores y mejoras visuales, con el objetivo de entregar una versión funcional, estable y clara para el usuario.

# **Tareas pendientes para la integración y pruebas finales**

Actualmente, el sistema cuenta con una funcionalidad en proceso y varias tareas pendientes que deben completarse para finalizar el proyecto.

## **En proceso**

* Integración completa entre el frontend y el backend, enfocada en la unión total de la aplicación con el servidor, así como la corrección de errores de red, sincronización de datos y validación de respuestas.

## **Pendientes**

* Implementar el sistema de recompensas interactivas, incluyendo medallas y logros (badges) para incentivar la constancia del usuario.  
* Desarrollar el sistema de notificaciones push y recordatorios locales, con el objetivo de mejorar la retención y el seguimiento de hábitos.  
* Realizar pruebas finales de integración para asegurar que todos los módulos funcionen correctamente en conjunto.  
* Detectar y corregir errores funcionales y de interfaz identificados durante las pruebas.  
* Optimizar el rendimiento general de la aplicación, reduciendo tiempos de carga y mejorando la experiencia del usuario.
