-- =====================================================
-- USERS SEED
-- =====================================================

INSERT OR IGNORE INTO users (username, email, password_hash, role, total_xp)
VALUES 
(
    'Daniel',
    'daniel@correo.com',
    'scrypt:32768:8:1$WikUmFaQkTvl4lH7$cd5b95153c1b0a72ec8d9e39dd4bfb7654e6b12552d34c7637157d2d6f7cc675db5644ce36416e5711cde5801440110a2d4a83236628fa53f4a3154c80910bb8',
    'user',
    0
),
(
    'Gustavo',
    'gustavo@correo.com',
    'scrypt:32768:8:1$TEHtUakfY18WCOcp$807220279ffea8610447d0bf83a1f8bb112f49ec49bd989b203e5fb21c51213a76d7938d48c1f826bb985e32a81b823a2b5546eb2d1ed5f1a3a34463c3717d80',
    'user',
    0
),
(
    'Adrian',
    'adrian@correo.com',
    'scrypt:32768:8:1$cWJQ9BTuaFCv82Sy$b90fbb8797c36594e1ff0bf71d789e4757757db8910b1aead4cb02acd01311d98f7e4771d1bebb1a3e2851bbfe6a67741c24b6b52587da6135dbc5c6b039c875',
    'user',
    0
),

(
    'Prueba',
    'prueba@correo.com',
    'scrypt:32768:8:1$ifWQRcoPaFDoct0u$4a8695472ce8835fd478499e2633f469cdcaaf8609fa68afd2ae294379928845e0c66247c17b32b4d85844a61c63757fc2abac3bcfee0a817ffbc87867f9058d',
    'user',
    0
);

-- =========================================
-- CATEGORIAS
-- =========================================
INSERT INTO categorias (nombre, descripcion) VALUES
('Salud y Bienestar', 'Hábitos físicos y mentales'),
('Productividad', 'Enfoque y rendimiento'),
('Orden', 'Organización personal');


-- =========================================
-- HABITOS
-- =========================================

-- SALUD Y BIENESTAR
INSERT INTO habitos (categoria_id, nombre, descripcion, dificultad, xp_base) VALUES
(1, 'Beber 2L de agua', 'Mantener hidratación diaria', 'Fácil', 10),
(1, 'Ejercicio 30 min', 'Actividad física diaria', 'Media', 20),
(1, 'Comida saludable', 'Alimentación balanceada', 'Media', 15),
(1, 'Meditar 5-10 min', 'Relajación mental', 'Fácil', 10),
(1, 'Día sin quejas', 'Control emocional', 'Difícil', 25);


-- PRODUCTIVIDAD
INSERT INTO habitos (categoria_id, nombre, descripcion, dificultad, xp_base) VALUES
(2, 'Trabajo profundo 60 min', 'Sesión sin distracciones', 'Difícil', 30),
(2, 'Completar tarea clave', 'Tarea importante del día', 'Media', 20),
(2, 'Empezar antes de las 9am', 'Disciplina matutina', 'Media', 15),
(2, 'Leer 20 min', 'Lectura diaria', 'Fácil', 10),
(2, 'Practicar idioma', 'Aprendizaje lingüístico', 'Media', 15);


-- ORDEN
INSERT INTO habitos (categoria_id, nombre, descripcion, dificultad, xp_base) VALUES
(3, 'Tender la cama', 'Orden básico diario', 'Fácil', 5),
(3, 'Dormir', 'Orden básico diario', 'Fácil', 5);
