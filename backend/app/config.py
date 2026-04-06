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
from typing import Mapping

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = BASE_DIR / "backend"

load_dotenv()
load_dotenv(BACKEND_DIR / ".env", override=False)
load_dotenv(BACKEND_DIR / ".env.local", override=False)

DEFAULT_SQLITE_DB_PATH = BASE_DIR / "data" / "app.db"
MIN_SECRET_LENGTH = 32
INSECURE_SECRET_VALUES = {
    "",
    "change-me-in-production",
    "change-me-jwt-secret",
    "replace-with-strong-secret",
    "replace-with-strong-jwt-secret",
}


def _coerce_bool(raw_value: str) -> bool:
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _looks_placeholder(secret: str) -> bool:
    normalized = secret.strip().lower()
    return normalized in INSECURE_SECRET_VALUES or normalized.startswith(
        ("change-me", "replace-with", "example-", "default-")
    )


class Config:
    """Base configuration loaded from environment variables."""

    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_DB_PATH}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-jwt-secret")
    DEBUG = _coerce_bool(os.getenv("FLASK_DEBUG", "false"))
    TESTING = _coerce_bool(os.getenv("TESTING", "false"))
    ENVIRONMENT = os.getenv("FLASK_ENV", "production").strip().lower()

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def is_development_like(config: Mapping[str, object]) -> bool:
    """Return True when the runtime should allow local-development defaults."""
    environment = str(
        config.get("ENVIRONMENT") or config.get("FLASK_ENV") or "production"
    ).strip().lower()
    return bool(config.get("DEBUG")) or bool(config.get("TESTING")) or environment == "development"


def validate_runtime_secrets(config: Mapping[str, object]) -> None:
    """Fail fast on insecure secrets outside development-like runtimes."""
    if is_development_like(config):
        return

    invalid_settings: list[str] = []

    for setting_name in ("SECRET_KEY", "JWT_SECRET_KEY"):
        secret = str(config.get(setting_name) or "").strip()
        if len(secret) < MIN_SECRET_LENGTH or _looks_placeholder(secret):
            invalid_settings.append(setting_name)

    if invalid_settings:
        names = ", ".join(invalid_settings)
        raise ValueError(
            f"Insecure runtime secret configuration for {names}. "
            f"Set strong values with at least {MIN_SECRET_LENGTH} characters."
        )


def is_openai_configured(config: Mapping[str, object]) -> bool:
    """Return True when photo validation has a configured provider key."""
    return bool(str(config.get("OPENAI_API_KEY") or "").strip())


def describe_openai_configuration(config: Mapping[str, object]) -> dict[str, object]:
    """Describe validation configuration without overstating provider readiness."""
    if not is_openai_configured(config):
        return {
            "provider": "openai",
            "configured": False,
            "status": "not_configured",
            "message": "OpenAI API key is not configured.",
        }

    return {
        "provider": "openai",
        "configured": True,
        "status": "configured_unverified",
        "message": "OpenAI API key is configured; provider availability is verified at request time.",
    }
