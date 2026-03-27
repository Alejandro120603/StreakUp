"""
Validation routes module.

Responsibility:
- Define HTTP endpoint for habit image validation.
- Requires JWT authentication.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.validation_service import validate_habit
from app.utils.error_handler import error_response

validation_bp = Blueprint("validation", __name__)


@validation_bp.route("/validate", methods=["POST"])
@jwt_required()
def validate():
    """Validate a habit via image analysis."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    if not data:
        return error_response("Request body is required.", 400)

    habit_id = data.get("habit_id")
    image = data.get("image")

    if not habit_id:
        return error_response("habit_id is required.", 400)
    if not image:
        return error_response("image (base64) is required.", 400)

    try:
        result = validate_habit(user_id, int(habit_id), image)
        return jsonify(result), 200
    except ValueError as exc:
        return error_response(str(exc), 400)
    except Exception as exc:
        return error_response(f"Error en la validación: {str(exc)}", 500)
