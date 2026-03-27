"""
Stats routes module.

Responsibility:
- HTTP endpoints for user statistics.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.stats_service import get_summary, get_detailed_stats

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    """Return stats summary (streak, today progress, completion rate)."""
    user_id = int(get_jwt_identity())
    data = get_summary(user_id)
    return jsonify(data), 200


@stats_bp.route("/detailed", methods=["GET"])
@jwt_required()
def detailed():
    """Return detailed stats for the stats dashboard."""
    user_id = int(get_jwt_identity())
    data = get_detailed_stats(user_id)
    return jsonify(data), 200

