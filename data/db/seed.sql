-- =====================================================
-- CATALOG BOOTSTRAP SEED
-- =====================================================
-- This file contains only canonical catalog data.
-- Hosted environments should use: flask seed-catalog
-- Local SQLite resets may also apply this script directly.

INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES
(1, 'Salud y Bienestar', 'Hábitos físicos y mentales'),
(2, 'Productividad', 'Enfoque y rendimiento'),
(3, 'Orden', 'Organización personal');

INSERT OR IGNORE INTO habitos (id, categoria_id, nombre, descripcion, dificultad, xp_base) VALUES
(1, 1, 'Beber 2L de agua', 'Mantener hidratación diaria', 'facil', 10),
(2, 1, 'Ejercicio 30 min', 'Actividad física diaria', 'media', 20),
(3, 1, 'Comida saludable', 'Alimentación balanceada', 'media', 15),
(4, 1, 'Meditar 5-10 min', 'Relajación mental', 'facil', 10),
(5, 1, 'Día sin quejas', 'Control emocional', 'dificil', 25),
(6, 2, 'Trabajo profundo 60 min', 'Sesión sin distracciones', 'dificil', 30),
(7, 2, 'Completar tarea clave', 'Tarea importante del día', 'media', 20),
(8, 2, 'Empezar antes de las 9am', 'Disciplina matutina', 'media', 15),
(9, 2, 'Leer 20 min', 'Lectura diaria', 'facil', 10),
(10, 2, 'Practicar idioma', 'Aprendizaje lingüístico', 'media', 15),
(11, 3, 'Tender la cama', 'Orden básico diario', 'facil', 5),
(12, 3, 'Dormir', 'Orden básico diario', 'facil', 5);
