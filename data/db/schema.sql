-- STREAKUP - SCHEMA.SQL (SQLite)
-- =========================================

PRAGMA foreign_keys = ON;

-- =====================================================
-- USUARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_usuario TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    xp_usuario INTEGER NOT NULL DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email 
ON usuarios(email);


-- =====================================================
-- CATEGORIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
    categoria_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_categoria TEXT NOT NULL UNIQUE,
    descripcion TEXT
);


-- =====================================================
-- HABITOS (CATÁLOGO)
-- =====================================================
CREATE TABLE IF NOT EXISTS habitos (
    habito_id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    nombre_habito TEXT NOT NULL,
    descripcion TEXT,
    dificultad TEXT NOT NULL CHECK (dificultad IN ('facil','media','dificil')),
    xp_base INTEGER NOT NULL,

    FOREIGN KEY (categoria_id) 
        REFERENCES categorias(categoria_id)
        ON DELETE CASCADE
);


-- =====================================================
-- HABITOS_USUARIO (HÁBITOS ACTIVOS POR USUARIO)
-- =====================================================
CREATE TABLE IF NOT EXISTS habitos_usuario (
    habitousuario_id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    habito_id INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(usuario_id)
        ON DELETE CASCADE,

    FOREIGN KEY (habito_id) 
        REFERENCES habitos(habito_id)
        ON DELETE CASCADE
);


-- =====================================================
-- REGISTRO_HABITOS (CONTROL DIARIO)
-- =====================================================
CREATE TABLE IF NOT EXISTS registro_habitos (
    registro_id INTEGER PRIMARY KEY AUTOINCREMENT,
    habitousuario_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    completado INTEGER NOT NULL CHECK (completado IN (0,1)),
    xp_ganado INTEGER NOT NULL,

    FOREIGN KEY (habitousuario_id) 
        REFERENCES habitos_usuario(habitousuario_id)
        ON DELETE CASCADE,

  
    UNIQUE (habitousuario_id, fecha)
);


-- =====================================================
-- NIVELES
-- =====================================================
CREATE TABLE IF NOT EXISTS niveles (
    nivel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_nivel TEXT NOT NULL,
    xp_minimo INTEGER NOT NULL,
    xp_maximo INTEGER NOT NULL,
    recompensa TEXT,
    descripcion TEXT
);