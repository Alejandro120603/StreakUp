"""
Authentication routes module.

Responsibility:
- Define HTTP endpoints for user registration and login.
"""

from flask import Blueprint, jsonify, request

from app.schemas.validations import validate_login_input, validate_register_input
from app.services.auth_service import login_user, register_user
from app.utils.error_handler import error_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user account."""
    data = request.get_json(silent=True)

    errors = validate_register_input(data)
    if errors:
        return error_response(errors, 400)

    try:
        user = register_user(
            username=data["username"],
            email=data["email"],
            password=data["password"],
        )
        return jsonify({"message": "User registered successfully.", "user": user}), 201
    except ValueError as exc:
        return error_response(str(exc), 409)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user and return JWT tokens."""
    data = request.get_json(silent=True)

    errors = validate_login_input(data)
    if errors:
        return error_response(errors, 400)

    try:
        result = login_user(email=data["email"], password=data["password"])
        return jsonify(result), 200
    except ValueError as exc:
        return error_response(str(exc), 401)
