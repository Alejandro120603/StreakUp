"""
Stats routes module.

Responsibility:
- HTTP endpoint for user statistics summary.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.stats_service import get_summary

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    """Return stats summary (streak, today progress, completion rate)."""
    user_id = int(get_jwt_identity())
    data = get_summary(user_id)
    return jsonify(data), 200
