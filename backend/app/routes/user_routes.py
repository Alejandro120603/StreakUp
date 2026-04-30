"""
User routes module.

Responsibility:
- Define HTTP endpoints for user profile and account management.

Endpoints:
  GET  /api/users/me   → return the authenticated user's public profile.
  DELETE /api/users/me → permanently delete the account and all related data.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.achievement import UserAchievement
from app.models.checkin import CheckIn
from app.models.pomodoro_session import PomodoroSession
from app.models.user import User
from app.models.user_habit import UserHabit
from app.models.validation_log import ValidationLog
from app.models.xp_log import XpLog
from app.utils.error_handler import error_response

user_bp = Blueprint("users", __name__)


@user_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Return the authenticated user's public profile."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return error_response("Usuario no encontrado.", 404)

    return jsonify(user.to_dict()), 200


@user_bp.route("/me", methods=["DELETE"])
@jwt_required()
def delete_account():
    """
    Permanently delete the authenticated user and all their data.

    Cascade order (child → parent to respect FK constraints):
      1. XpLog          (references User)
      2. ValidationLog  (references UserHabit)
      3. CheckIn        (references UserHabit)
      4. PomodoroSession(references User)
      5. UserAchievement(references User)
      6. UserHabit      (references User + Habit)
      7. User           (root entity)
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return error_response("Usuario no encontrado.", 404)

    try:
        # 1. XP logs
        XpLog.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # 2. Gather user_habit IDs for child-table cleanup
        user_habit_ids = [
            row.id
            for row in UserHabit.query.filter_by(user_id=user_id).with_entities(UserHabit.id).all()
        ]

        if user_habit_ids:
            # 2a. Validation logs
            ValidationLog.query.filter(
                ValidationLog.habitousuario_id.in_(user_habit_ids)
            ).delete(synchronize_session=False)

            # 2b. Check-ins
            CheckIn.query.filter(
                CheckIn.habitousuario_id.in_(user_habit_ids)
            ).delete(synchronize_session=False)

        # 3. Pomodoro sessions
        PomodoroSession.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # 4. Achievements
        UserAchievement.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # 5. User habits
        UserHabit.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # 6. User itself
        db.session.delete(user)
        db.session.commit()

        return jsonify({"message": "Cuenta eliminada correctamente."}), 200

    except Exception:
        db.session.rollback()
        import logging
        logging.getLogger(__name__).exception(
            "Error deleting account for user_id=%s", user_id
        )
        return error_response("No se pudo eliminar la cuenta. Inténtalo de nuevo.", 500)
