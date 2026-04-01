"""
Habit routes module.

Responsibility:
- Define HTTP endpoints for catalog habits and user habit assignments.
- All endpoints require JWT authentication.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.habit_service import (
    assign_habit_to_user,
    deactivate_user_habit,
    get_habits,
    list_catalog_habits,
)
from app.utils.error_handler import error_response

habits_bp = Blueprint("habits", __name__)


@habits_bp.route("/habitos", methods=["GET"])
@jwt_required()
def list_catalog():
    """Return the habit catalog."""
    return jsonify(list_catalog_habits()), 200


@habits_bp.route("/habitos_usuario", methods=["POST"])
@jwt_required()
def assign():
    """Assign a catalog habit to the authenticated user."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    if not data or "habito_id" not in data:
        return error_response("habito_id is required.", 400)

    try:
        habit = assign_habit_to_user(user_id, int(data["habito_id"]))
        return jsonify(habit), 201
    except ValueError as exc:
        return error_response(str(exc), 409)
    except LookupError as exc:
        return error_response(str(exc), 404)


@habits_bp.route("/mis-habitos", methods=["GET"])
@jwt_required()
def list_user_habits():
    """Return active habits for the authenticated user."""
    user_id = int(get_jwt_identity())
    return jsonify(get_habits(user_id)), 200


@habits_bp.route("/habitos_usuario/<int:habit_id>", methods=["DELETE"])
@jwt_required()
def deactivate(habit_id: int):
    """Deactivate an assigned habit for the authenticated user."""
    user_id = int(get_jwt_identity())
    if not deactivate_user_habit(habit_id, user_id):
        return error_response("Habit not found.", 404)
    return jsonify({"message": "Habit deactivated successfully."}), 200


@habits_bp.route("/habits", methods=["GET"])
@jwt_required()
def list_habits():
    """Compatibility endpoint for the existing frontend habits list."""
    user_id = int(get_jwt_identity())
    return jsonify(get_habits(user_id)), 200


@habits_bp.route("/habits/<int:habit_id>", methods=["DELETE"])
@jwt_required()
def delete(habit_id: int):
    """Compatibility endpoint that deactivates an assigned habit."""
    user_id = int(get_jwt_identity())
    if not deactivate_user_habit(habit_id, user_id):
        return error_response("Habit not found.", 404)
    return jsonify({"message": "Habit deactivated successfully."}), 200
