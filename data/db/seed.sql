-- =====================================================
-- CATALOG BOOTSTRAP SEED (LOCAL SQLITE ONLY)
-- Hosted environments must use: flask seed-catalog
-- This file intentionally keeps SQLite-specific INSERT OR IGNORE
-- semantics for local reset convenience.
-- =====================================================

INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES
(1, 'Salud y Bienestar', 'Habitos fisicos y mentales'),
(2, 'Productividad', 'Enfoque y rendimiento'),
(3, 'Orden', 'Organizacion personal');

INSERT OR IGNORE INTO habitos (id, categoria_id, nombre, descripcion, dificultad, xp_base) VALUES
(1, 1, 'Beber 2L de agua', 'Mantener hidratacion diaria', 'facil', 10),
(2, 1, 'Ejercicio 30 min', 'Actividad fisica diaria', 'media', 20),
(3, 1, 'Comida saludable', 'Alimentacion balanceada', 'media', 15),
(4, 1, 'Meditar 5-10 min', 'Relajacion mental', 'facil', 10),
(5, 1, 'Dia sin quejas', 'Control emocional', 'dificil', 25),
(6, 2, 'Trabajo profundo 60 min', 'Sesion sin distracciones', 'dificil', 30),
(7, 2, 'Completar tarea clave', 'Tarea importante del dia', 'media', 20),
(8, 2, 'Empezar antes de las 9am', 'Disciplina matutina', 'media', 15),
(9, 2, 'Leer 20 min', 'Lectura diaria', 'facil', 10),
(10, 2, 'Practicar idioma', 'Aprendizaje linguistico', 'media', 15),
(11, 3, 'Tender la cama', 'Orden basico diario', 'facil', 5),
(12, 3, 'Dormir', 'Orden basico diario', 'facil', 5);
