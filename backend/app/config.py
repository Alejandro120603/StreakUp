"""
Configuration module for the StreakUP Flask backend.

Responsibility:
- Centralize environment-driven settings.
- Provide base and environment-specific config classes.

Should contain:
- Config classes and default values.
- Environment variable mapping.

Should NOT contain:
- Business logic.
- Runtime side effects.
- Service orchestration.
"""

import os


class Config:
    """Base configuration loaded from environment variables."""

    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///streakup_dev.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-jwt-secret")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
