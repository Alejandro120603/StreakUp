"""
Authentication service module.

Responsibility:
- Host authentication domain use cases (register, login).
- Coordinate between User model and JWT token issuance.
"""

from flask_jwt_extended import create_access_token, create_refresh_token

from app.extensions import db
from app.models.user import User


def register_user(username: str, email: str, password: str) -> dict:
    """Register a new user with a hashed password.

    Returns:
        dict with user data on success.

    Raises:
        ValueError: if username or email already exists.
    """
    username = username.strip()
    email = email.strip().lower()

    if User.query.filter_by(email=email).first():
        raise ValueError("A user with this email already exists.")

    if User.query.filter_by(username=username).first():
        raise ValueError("A user with this username already exists.")

    user = User(username=username, email=email, role="user")
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # Seed a default habit for every new user
    from app.services.habit_service import seed_default_habit
    seed_default_habit(user.id)

    return user.to_dict()


def login_user(email: str, password: str) -> dict:
    """Authenticate a user and return JWT tokens.

    Returns:
        dict with access_token, refresh_token, and user data.

    Raises:
        ValueError: if credentials are invalid.
    """
    email = email.strip().lower()

    user = User.query.filter_by(email=email).first()

    if user is None or not user.check_password(password):
        raise ValueError("Invalid email or password.")

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username},
    )
    refresh_token = create_refresh_token(identity=str(user.id))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }
