"""Initial schema baseline.

Revision ID: 0001_initial_baseline
Revises:
Create Date: 2026-04-05
"""

from alembic import op


revision = "0001_initial_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    statements = [
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            total_xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            xp_in_level INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX idx_users_email ON users(email)",
        """
        CREATE TABLE xp_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            fuente TEXT NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """,
        "CREATE INDEX idx_xp_logs_usuario ON xp_logs(usuario_id)",
        """
        CREATE TABLE categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            descripcion TEXT
        )
        """,
        """
        CREATE TABLE habitos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            categoria_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            dificultad TEXT NOT NULL CHECK (dificultad IN ('facil','media','dificil')),
            xp_base INTEGER NOT NULL CHECK (xp_base >= 0),
            FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE habitos_usuario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            habito_id INTEGER NOT NULL,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE,
            activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (habito_id) REFERENCES habitos(id) ON DELETE CASCADE,
            UNIQUE (usuario_id, habito_id, activo)
        )
        """,
        "CREATE INDEX idx_habitos_usuario_usuario ON habitos_usuario(usuario_id)",
        """
        CREATE TABLE registro_habitos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habitousuario_id INTEGER NOT NULL,
            fecha DATE NOT NULL,
            completado INTEGER NOT NULL CHECK (completado IN (0,1)),
            xp_ganado INTEGER NOT NULL CHECK (xp_ganado >= 0),
            FOREIGN KEY (habitousuario_id) REFERENCES habitos_usuario(id) ON DELETE CASCADE,
            UNIQUE (habitousuario_id, fecha)
        )
        """,
        "CREATE INDEX idx_registro_fecha ON registro_habitos(fecha)",
        """
        CREATE TABLE validaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habitousuario_id INTEGER NOT NULL,
            tipo_validacion TEXT NOT NULL CHECK (tipo_validacion IN ('foto','tiempo','manual')),
            evidencia TEXT,
            tiempo_segundos INTEGER,
            validado INTEGER DEFAULT 0 CHECK (validado IN (0,1)),
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (habitousuario_id) REFERENCES habitos_usuario(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE niveles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            xp_minimo INTEGER NOT NULL,
            xp_maximo INTEGER NOT NULL,
            recompensa TEXT,
            descripcion TEXT,
            CHECK (xp_minimo < xp_maximo)
        )
        """,
    ]

    for statement in statements:
        op.execute(statement)


def downgrade() -> None:
    statements = [
        "DROP TABLE IF EXISTS niveles",
        "DROP TABLE IF EXISTS validaciones",
        "DROP INDEX IF EXISTS idx_registro_fecha",
        "DROP TABLE IF EXISTS registro_habitos",
        "DROP INDEX IF EXISTS idx_habitos_usuario_usuario",
        "DROP TABLE IF EXISTS habitos_usuario",
        "DROP TABLE IF EXISTS habitos",
        "DROP TABLE IF EXISTS categorias",
        "DROP INDEX IF EXISTS idx_xp_logs_usuario",
        "DROP TABLE IF EXISTS xp_logs",
        "DROP INDEX IF EXISTS idx_users_email",
        "DROP TABLE IF EXISTS users",
    ]

    for statement in statements:
        op.execute(statement)
