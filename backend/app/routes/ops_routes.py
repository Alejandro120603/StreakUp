"""
Operational routes module.

Responsibility:
- Provide simple liveness and readiness endpoints for hosting.
"""

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from app.config import describe_openai_configuration
from app.extensions import db
from app.models.habit import Category, Habit

ops_bp = Blueprint("ops", __name__)


@ops_bp.route("/healthz", methods=["GET"])
def healthz():
    """Return process liveness only."""
    return jsonify({"status": "ok"}), 200


@ops_bp.route("/readyz", methods=["GET"])
def readyz():
    """Return readiness based on DB connectivity and required catalog data."""
    try:
        db.session.execute(text("SELECT 1"))
        categories = Category.query.count()
        habits = Habit.query.count()
    except Exception:
        return (
            jsonify(
                {
                    "status": "not_ready",
                    "checks": {
                        "database": {"ready": False},
                        "catalog": {"ready": False},
                        "validation": describe_openai_configuration(current_app.config),
                    },
                }
            ),
            503,
        )

    catalog_ready = categories > 0 and habits > 0
    status_code = 200 if catalog_ready else 503

    return (
        jsonify(
            {
                "status": "ready" if catalog_ready else "not_ready",
                "checks": {
                    "database": {"ready": True},
                    "catalog": {
                        "ready": catalog_ready,
                        "categories": categories,
                        "habits": habits,
                    },
                    "validation": describe_openai_configuration(current_app.config),
                },
            }
        ),
        status_code,
    )
