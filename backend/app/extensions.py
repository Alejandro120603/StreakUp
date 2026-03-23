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

from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()



def init_extensions(app) -> None:
    """Initialize Flask extensions for the provided app instance."""
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
