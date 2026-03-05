"""
Application factory module for the StreakUP Flask backend.

Responsibility:
- Create and configure the Flask application instance.
- Initialize shared extensions and register blueprints.
"""

from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import init_extensions


def create_app(config_class: type[Config] = Config) -> Flask:
    """Create and configure the Flask application instance."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for frontend communication
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    init_extensions(app)

    # Register blueprints
    from app.routes.auth_routes import auth_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    # Create database tables in development
    with app.app_context():
        from app.models.user import User  # noqa: F401

        from .extensions import db

        db.create_all()

    return app
