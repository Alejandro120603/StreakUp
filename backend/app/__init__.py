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
    print("DB URI:", app.config["SQLALCHEMY_DATABASE_URI"])

    # Enable CORS for frontend communication
    CORS(app, resources={r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }})

    init_extensions(app)

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.habit_routes import habits_bp
    from app.routes.checkin_routes import checkins_bp
    from app.routes.stats_routes import stats_bp
    from app.routes.pomodoro_routes import pomodoro_bp
    from app.routes.validation_routes import validation_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(habits_bp, url_prefix="/api")
    app.register_blueprint(checkins_bp, url_prefix="/api/checkins")
    app.register_blueprint(stats_bp, url_prefix="/api/stats")
    app.register_blueprint(pomodoro_bp, url_prefix="/api/pomodoro")
    app.register_blueprint(validation_bp, url_prefix="/api/habits")

    with app.app_context():
        from app.models.user import User  # noqa: F401
        from app.models.habit import Habit  # noqa: F401
        from app.models.user_habit import UserHabit  # noqa: F401
        from app.models.checkin import CheckIn  # noqa: F401
        from app.models.pomodoro_session import PomodoroSession  # noqa: F401
        from app.models.validation_log import ValidationLog  # noqa: F401

    return app
