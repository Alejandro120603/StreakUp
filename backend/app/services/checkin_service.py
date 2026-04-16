"""
Check-in service module.

Responsibility:
- Toggle daily check-ins for habits.
- Query today's habits with completion status.
"""

from datetime import date as date_type

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.user_habit import UserHabit
from app.services.habit_service import list_active_user_habits, serialize_user_habit
from app.services.xp_service import award_xp, revoke_xp


def _is_validation_driven(user_habit: UserHabit) -> bool:
    validation_type = user_habit.tipo_validacion or user_habit.habit.tipo_validacion
    return validation_type in {"foto", "texto", "tiempo"}


def toggle_checkin(user_id: int, habit_id: int, target_date: date_type | None = None) -> dict:
    """Toggle a check-in for a habit on a given date."""
    if target_date is None:
        target_date = date_type.today()

    user_habit = UserHabit.query.filter_by(
        id=habit_id,
        usuario_id=user_id,
        activo=True,
    ).first()
    if user_habit is None:
        raise LookupError("Habit not found.")
    if _is_validation_driven(user_habit):
        raise ValueError("This habit requires validation before progress can be granted.")

    try:
        existing = CheckIn.query.filter_by(
            habitousuario_id=user_habit.id,
            fecha=target_date,
        ).first()

        if existing:
            xp_to_revoke = existing.xp_ganado
            db.session.delete(existing)
            if xp_to_revoke > 0:
                revoke_xp(user_id, xp_to_revoke, "checkin_undo", commit=False)
            db.session.commit()
            return {"checked": False, "habit_id": habit_id, "date": target_date.isoformat()}

        xp_base = user_habit.habit.xp_base if user_habit.habit else 10
        checkin = CheckIn(
            habitousuario_id=user_habit.id,
            fecha=target_date,
            completado=True,
            xp_ganado=xp_base,
        )
        db.session.add(checkin)
        award_xp(user_id, xp_base, "checkin", commit=False)
        db.session.commit()
        return {"checked": True, "habit_id": habit_id, "date": target_date.isoformat()}
    except Exception:
        db.session.rollback()
        raise


def get_today_habits(user_id: int, target_date: date_type | None = None) -> list[dict]:
    """Return all active habits with their check-in status for today."""
    if target_date is None:
        target_date = date_type.today()

    user_habits = list_active_user_habits(user_id)
    user_habit_ids = [uh.id for uh in user_habits]
    if user_habit_ids:
        checkins = CheckIn.query.filter(
            CheckIn.habitousuario_id.in_(user_habit_ids),
            CheckIn.fecha == target_date,
        ).all()
        checked_ids = {checkin.habitousuario_id for checkin in checkins}
    else:
        checked_ids = set()

    result = []
    for user_habit in user_habits:
        habit_dict = serialize_user_habit(user_habit)
        habit_dict["checked_today"] = user_habit.id in checked_ids
        result.append(habit_dict)

    return result
