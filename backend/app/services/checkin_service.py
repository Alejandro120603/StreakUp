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
from app.services.habit_service import serialize_user_habit, list_active_user_habits


def toggle_checkin(user_id: int, habit_id: int, target_date: date_type | None = None) -> dict:
    """Toggle a check-in for a habit on a given date.

    Here habit_id is the UserHabit.id (assigned habit).
    If no check-in exists, create one (completed=True).
    If one exists, delete it (un-check).
    """
    if target_date is None:
        target_date = date_type.today()

    # Verify habit belongs to user
    user_habit = UserHabit.query.filter_by(
        id=habit_id, usuario_id=user_id, activo=True
    ).first()
    if user_habit is None:
        raise ValueError("Habit not found.")

    existing = CheckIn.query.filter_by(
        habitousuario_id=user_habit.id, fecha=target_date
    ).first()

    if existing:
        db.session.delete(existing)
        db.session.commit()
        return {"checked": False, "habit_id": habit_id, "date": target_date.isoformat()}
    else:
        checkin = CheckIn(
            habitousuario_id=user_habit.id,
            fecha=target_date,
            completado=True,
            xp_ganado=0,
        )
        db.session.add(checkin)
        db.session.commit()
        return {"checked": True, "habit_id": habit_id, "date": target_date.isoformat()}


def get_today_habits(user_id: int, target_date: date_type | None = None) -> list[dict]:
    """Return all active habits with their check-in status for today."""
    if target_date is None:
        target_date = date_type.today()

    user_habits = list_active_user_habits(user_id)

    # Get all check-ins for today for this user's habits
    user_habit_ids = [uh.id for uh in user_habits]
    if user_habit_ids:
        checkins = CheckIn.query.filter(
            CheckIn.habitousuario_id.in_(user_habit_ids),
            CheckIn.fecha == target_date,
        ).all()
        checked_ids = {c.habitousuario_id for c in checkins}
    else:
        checked_ids = set()

    result = []
    for uh in user_habits:
        habit_dict = serialize_user_habit(uh)
        habit_dict["checked_today"] = uh.id in checked_ids
        result.append(habit_dict)

    return result
