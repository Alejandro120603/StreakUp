"""
Extension registry for shared Flask integrations.

Responsibility:
- Define globally shared extension instances.
- Provide centralized extension initialization for the app factory.

Should contain:
- SQLAlchemy/JWT initialization objects.
- Minimal extension setup hooks.

Should NOT contain:
- Domain logic.
- Endpoint implementation.
- Complex extension callbacks and policies.
"""

import sqlite3

from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.engine import Engine


db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    """Force SQLite foreign keys on for every SQLAlchemy-managed connection."""
    if not isinstance(dbapi_connection, sqlite3.Connection):
        return

    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()



def init_extensions(app) -> None:
    """Initialize Flask extensions for the provided app instance."""
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
