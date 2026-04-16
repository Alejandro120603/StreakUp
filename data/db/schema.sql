-- =========================================
-- STREAKUP - SCHEMA.SQL (LOCAL SQLITE)
-- Source of truth for hosted environments is Alembic + ORM.
-- This file remains a SQLite-only convenience for local resets.
-- =========================================

PRAGMA foreign_keys = ON;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    xp_in_level INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =====================================================
-- CATEGORIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE INDEX IF NOT EXISTS idx_categorias_nombre ON categorias(nombre);

-- =====================================================
-- HABITOS (CATALOGO)
-- =====================================================
CREATE TABLE IF NOT EXISTS habitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    dificultad TEXT NOT NULL CHECK (dificultad IN ('facil','media','dificil')),
    xp_base INTEGER NOT NULL CHECK (xp_base >= 0),
    tipo_validacion TEXT NOT NULL DEFAULT 'foto' CHECK (tipo_validacion IN ('foto','texto','tiempo')),
    frecuencia TEXT NOT NULL DEFAULT 'daily' CHECK (frecuencia IN ('daily','weekly')),
    cantidad_objetivo INTEGER CHECK (cantidad_objetivo IS NULL OR cantidad_objetivo >= 0),
    unidad_objetivo TEXT,
    duracion_objetivo_minutos INTEGER CHECK (duracion_objetivo_minutos IS NULL OR duracion_objetivo_minutos >= 0),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_habitos_categoria ON habitos(categoria_id);

-- =====================================================
-- HABITOS_USUARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS habitos_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    habito_id INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
    nombre_personalizado TEXT,
    descripcion_personalizada TEXT,
    tipo_validacion TEXT CHECK (tipo_validacion IS NULL OR tipo_validacion IN ('foto','texto','tiempo')),
    frecuencia TEXT CHECK (frecuencia IS NULL OR frecuencia IN ('daily','weekly')),
    cantidad_objetivo INTEGER CHECK (cantidad_objetivo IS NULL OR cantidad_objetivo >= 0),
    unidad_objetivo TEXT,
    duracion_objetivo_minutos INTEGER CHECK (duracion_objetivo_minutos IS NULL OR duracion_objetivo_minutos >= 0),
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (habito_id) REFERENCES habitos(id) ON DELETE CASCADE,
    UNIQUE (usuario_id, habito_id, activo)
);

CREATE INDEX IF NOT EXISTS idx_habitos_usuario_usuario ON habitos_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_habitos_usuario_habito ON habitos_usuario(habito_id);

-- =====================================================
-- REGISTRO_HABITOS
-- =====================================================
CREATE TABLE IF NOT EXISTS registro_habitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habitousuario_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    completado INTEGER NOT NULL DEFAULT 1 CHECK (completado IN (0,1)),
    xp_ganado INTEGER NOT NULL DEFAULT 0 CHECK (xp_ganado >= 0),
    FOREIGN KEY (habitousuario_id) REFERENCES habitos_usuario(id) ON DELETE CASCADE,
    UNIQUE (habitousuario_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_registro_fecha ON registro_habitos(fecha);

-- =====================================================
-- VALIDACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS validaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habitousuario_id INTEGER NOT NULL,
    tipo_validacion TEXT NOT NULL CHECK (tipo_validacion IN ('foto','texto','tiempo','manual')),
    evidencia TEXT,
    tiempo_segundos INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    validado INTEGER NOT NULL DEFAULT 0 CHECK (validado IN (0,1)),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habitousuario_id) REFERENCES habitos_usuario(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_validaciones_habitousuario ON validaciones(habitousuario_id);

-- =====================================================
-- XP_LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS xp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    fuente TEXT NOT NULL CHECK (fuente IN ('checkin','checkin_undo','validation')),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_xp_logs_usuario ON xp_logs(usuario_id);

-- =====================================================
-- POMODORO_SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    habit_id INTEGER,
    theme TEXT NOT NULL DEFAULT 'fire',
    study_minutes INTEGER NOT NULL DEFAULT 25 CHECK (study_minutes > 0),
    break_minutes INTEGER NOT NULL DEFAULT 5 CHECK (break_minutes >= 0),
    cycles INTEGER NOT NULL DEFAULT 4 CHECK (cycles > 0),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (habit_id) REFERENCES habitos_usuario(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_started
ON pomodoro_sessions(user_id, started_at);

-- =====================================================
-- NIVELES
-- =====================================================
CREATE TABLE IF NOT EXISTS niveles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    xp_minimo INTEGER NOT NULL,
    xp_maximo INTEGER NOT NULL,
    recompensa TEXT,
    descripcion TEXT,
    CHECK (xp_minimo < xp_maximo)
);
