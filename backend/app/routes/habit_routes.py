"""
Habit routes module.

Responsibility:
- Define HTTP endpoints for habit CRUD operations.
- All endpoints require JWT authentication.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.schemas.habit_validations import validate_create_habit, validate_update_habit
from app.services.habit_service import (
    create_habit,
    delete_habit,
    get_habits,
    update_habit,
)
from app.utils.error_handler import error_response

habits_bp = Blueprint("habits", __name__)


@habits_bp.route("", methods=["GET"])
@jwt_required()
def list_habits():
    """Return all habits for the authenticated user."""
    user_id = int(get_jwt_identity())
    habits = get_habits(user_id)
    return jsonify(habits), 200


@habits_bp.route("", methods=["POST"])
@jwt_required()
def create():
    """Create a new habit for the authenticated user."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    errors = validate_create_habit(data)
    if errors:
        return error_response(errors, 400)

    habit = create_habit(user_id, data)
    return jsonify(habit), 201


@habits_bp.route("/<int:habit_id>", methods=["PUT"])
@jwt_required()
def update(habit_id: int):
    """Update an existing habit."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    errors = validate_update_habit(data)
    if errors:
        return error_response(errors, 400)

    result = update_habit(habit_id, user_id, data)
    if result is None:
        return error_response("Habit not found.", 404)

    return jsonify(result), 200


@habits_bp.route("/<int:habit_id>", methods=["DELETE"])
@jwt_required()
def delete(habit_id: int):
    """Delete a habit."""
    user_id = int(get_jwt_identity())

    if not delete_habit(habit_id, user_id):
        return error_response("Habit not found.", 404)

    return jsonify({"message": "Habit deleted successfully."}), 200
