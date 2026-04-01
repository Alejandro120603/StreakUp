"""
Check-in service module.

Responsibility:
- Toggle daily check-ins for habits.
- Query today's habits with completion status.
- Award/revoke XP on check-in changes.
"""

from datetime import date as date_type

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.user_habit import UserHabit
from app.services.habit_service import get_user_habit, serialize_user_habit
from app.services.xp_service import award_xp

XP_PER_CHECKIN = 25


def toggle_checkin(user_id: int, habit_id: int, target_date: date_type | None = None) -> dict:
    """Toggle a check-in for a habit on a given date.

    If no check-in exists, create one (completed=True) and award XP.
    If one exists, delete it (un-check) and revoke XP.
    """
    if target_date is None:
        target_date = date_type.today()

    user_habit = get_user_habit(habit_id, user_id, active_only=True)
    if user_habit is None:
        raise ValueError("Habit not found.")

    existing = CheckIn.query.filter_by(
        habitousuario_id=user_habit.id,
        fecha=target_date,
    ).first()

    if existing:
        xp_delta = existing.xp_ganado
        db.session.delete(existing)
        db.session.commit()
        if xp_delta:
            award_xp(user_id, -xp_delta, "checkin_undo")
        return {"checked": False, "habit_id": habit_id, "date": target_date.isoformat()}

    checkin = CheckIn(
        habitousuario_id=user_habit.id,
        fecha=target_date,
        completado=True,
        xp_ganado=XP_PER_CHECKIN,
    )
    db.session.add(checkin)
    db.session.commit()
    award_xp(user_id, XP_PER_CHECKIN, "checkin")
    return {"checked": True, "habit_id": habit_id, "date": target_date.isoformat()}


def get_today_habits(user_id: int, target_date: date_type | None = None) -> list[dict]:
    """Return all daily habits with their check-in status for today."""
    if target_date is None:
        target_date = date_type.today()

    habits = (
        UserHabit.query
        .filter_by(usuario_id=user_id, activo=True)
        .all()
    )

    checkins = (
        CheckIn.query
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(
            UserHabit.usuario_id == user_id,
            UserHabit.activo.is_(True),
            CheckIn.fecha == target_date,
        )
        .all()
    )
    checked_ids = {checkin.habitousuario_id for checkin in checkins}

    result = []
    for habit in habits:
        habit_dict = serialize_user_habit(habit)
        habit_dict["checked_today"] = habit.id in checked_ids
        result.append(habit_dict)

    return result
