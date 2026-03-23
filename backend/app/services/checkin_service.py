"""
Check-in service module.

Responsibility:
- Toggle daily check-ins for habits.
- Query today's habits with completion status.
"""

from datetime import date as date_type

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.habit import Habit


def toggle_checkin(user_id: int, habit_id: int, target_date: date_type | None = None) -> dict:
    """Toggle a check-in for a habit on a given date.

    If no check-in exists, create one (completed=True).
    If one exists, delete it (un-check).
    """
    if target_date is None:
        target_date = date_type.today()

    # Verify habit belongs to user
    habit = Habit.query.filter_by(id=habit_id, user_id=user_id).first()
    if habit is None:
        raise ValueError("Habit not found.")

    existing = CheckIn.query.filter_by(
        habit_id=habit_id, user_id=user_id, date=target_date
    ).first()

    if existing:
        db.session.delete(existing)
        db.session.commit()
        return {"checked": False, "habit_id": habit_id, "date": target_date.isoformat()}
    else:
        checkin = CheckIn(
            habit_id=habit_id,
            user_id=user_id,
            date=target_date,
            completed=True,
        )
        db.session.add(checkin)
        db.session.commit()
        return {"checked": True, "habit_id": habit_id, "date": target_date.isoformat()}


def get_today_habits(user_id: int, target_date: date_type | None = None) -> list[dict]:
    """Return all daily habits with their check-in status for today."""
    if target_date is None:
        target_date = date_type.today()

    habits = Habit.query.filter_by(user_id=user_id, frequency="daily").order_by(Habit.name).all()

    checkins = CheckIn.query.filter_by(user_id=user_id, date=target_date).all()
    checked_ids = {c.habit_id for c in checkins}

    result = []
    for h in habits:
        habit_dict = h.to_dict()
        habit_dict["checked_today"] = h.id in checked_ids
        result.append(habit_dict)

    return result
