"""
Application factory module for the StreakUP Flask backend.

Responsibility:
- Create and configure the Flask application instance.
- Initialize shared extensions and register application-level components.

Should contain:
- App factory setup.
- Extension initialization wiring.
- Blueprint registration hooks.

Should NOT contain:
- Business rules.
- Route handler logic.
- Model definitions.
"""

from flask import Flask

from .config import Config
from .extensions import init_extensions



def create_app(config_class: type[Config] = Config) -> Flask:
    """Create and configure the Flask application instance."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    init_extensions(app)

    # Placeholder for future blueprint registration, for example:
    # from app.routes.auth_routes import auth_bp
    # app.register_blueprint(auth_bp, url_prefix="/api/auth")

    return app
