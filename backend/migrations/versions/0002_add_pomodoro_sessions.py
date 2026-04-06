"""Add pomodoro sessions table.

Revision ID: 0002_add_pomodoro_sessions
Revises: 0001_initial_baseline
Create Date: 2026-04-05
"""

from alembic import op


revision = "0002_add_pomodoro_sessions"
down_revision = "0001_initial_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    statements = [
        """
        CREATE TABLE pomodoro_sessions (
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
        )
        """,
        "CREATE INDEX idx_pomodoro_sessions_user_started ON pomodoro_sessions(user_id, started_at)",
    ]

    for statement in statements:
        op.execute(statement)


def downgrade() -> None:
    statements = [
        "DROP INDEX IF EXISTS idx_pomodoro_sessions_user_started",
        "DROP TABLE IF EXISTS pomodoro_sessions",
    ]

    for statement in statements:
        op.execute(statement)
