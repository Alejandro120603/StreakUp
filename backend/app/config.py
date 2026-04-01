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
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = BASE_DIR / "backend"

load_dotenv()
load_dotenv(BACKEND_DIR / ".env", override=False)
load_dotenv(BACKEND_DIR / ".env.local", override=False)

DEFAULT_SQLITE_DB_PATH = BASE_DIR / "data" / "app.db"


class Config:
    """Base configuration loaded from environment variables."""

    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_DB_PATH}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-jwt-secret")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
