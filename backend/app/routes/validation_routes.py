"""
Validation routes module.

Responsibility:
- Define HTTP endpoint for habit image validation.
- Requires JWT authentication.
"""

from collections.abc import Mapping

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.openai_service import ValidationUnavailableError
from app.services.validation_service import validate_habit
from app.utils.error_handler import error_response

validation_bp = Blueprint("validation", __name__)


def _extract_image_payload(data: Mapping[str, object]) -> tuple[str | None, str | None]:
    """Support both legacy and current validation payload shapes."""
    image_value = data.get("image_base64") or data.get("image")
    mime_type = data.get("mime_type")

    if not isinstance(image_value, str):
        return None, None

    image_value = image_value.strip()
    normalized_mime_type = mime_type.strip() if isinstance(mime_type, str) else None

    if image_value.startswith("data:") and "," in image_value:
        metadata, encoded = image_value.split(",", 1)
        image_value = encoded.strip()

        if normalized_mime_type is None and ";base64" in metadata:
            normalized_mime_type = metadata[len("data:") :].split(";", 1)[0].strip() or None

    return image_value or None, normalized_mime_type


@validation_bp.route("/validate", methods=["POST"])
@jwt_required()
def validate():
    """Validate a habit via image analysis."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True)

    if not data:
        return error_response("Request body is required.", 400)

    habit_id = data.get("habit_id")
    image_base64, mime_type = _extract_image_payload(data)

    if not habit_id:
        return error_response("habit_id is required.", 400)
    if not image_base64:
        return error_response("image (base64) is required.", 400)

    try:
        result = validate_habit(user_id, int(habit_id), image_base64, mime_type=mime_type)
        return jsonify(result), 200
    except ValueError as exc:
        return error_response(str(exc), 400)
    except ValidationUnavailableError as exc:
        return error_response(str(exc), 503, code=exc.code)
    except Exception:
        return error_response("Error interno en la validación.", 500)
