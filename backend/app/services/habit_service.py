"""
Habit service module.

Responsibility:
- Host CRUD use cases for habits.
"""

from app.extensions import db
from app.models.habit import Habit


SECTION_LABELS = {
    "fire": "BIENESTAR",
    "plant": "APRENDIZAJE",
    "moon": "SALUD",
}


def create_habit(user_id: int, data: dict) -> dict:
    """Create a new habit for the given user."""
    habit = Habit(
        user_id=user_id,
        name=data["name"],
        icon=data.get("icon", "🔥"),
        habit_type=data.get("habit_type", "boolean"),
        frequency=data.get("frequency", "daily"),
        section=data.get("section", "fire"),
        target_duration=data.get("target_duration"),
        pomodoro_enabled=data.get("pomodoro_enabled", False),
        target_quantity=data.get("target_quantity"),
        target_unit=data.get("target_unit"),
    )
    db.session.add(habit)
    db.session.commit()
    return habit.to_dict()


def get_habits(user_id: int) -> list[dict]:
    """Return all habits for a user, ordered by section then name."""
    habits = (
        Habit.query.filter_by(user_id=user_id)
        .order_by(Habit.section, Habit.name)
        .all()
    )
    return [h.to_dict() for h in habits]


def get_habit(habit_id: int, user_id: int) -> Habit | None:
    """Return a single habit if it belongs to the user."""
    return Habit.query.filter_by(id=habit_id, user_id=user_id).first()


def update_habit(habit_id: int, user_id: int, data: dict) -> dict | None:
    """Update a habit. Returns updated dict or None if not found."""
    habit = get_habit(habit_id, user_id)
    if habit is None:
        return None

    for field in ("name", "icon", "habit_type", "frequency", "section",
                  "target_duration", "pomodoro_enabled", "target_quantity", "target_unit"):
        if field in data:
            setattr(habit, field, data[field])

    db.session.commit()
    return habit.to_dict()


def delete_habit(habit_id: int, user_id: int) -> bool:
    """Delete a habit. Returns True if deleted, False if not found."""
    habit = get_habit(habit_id, user_id)
    if habit is None:
        return False

    db.session.delete(habit)
    db.session.commit()
    return True


def seed_default_habit(user_id: int) -> None:
    """Create a default 'Meditar' habit for a new user if they have none."""
    existing = Habit.query.filter_by(user_id=user_id).first()
    if existing is None:
        create_habit(user_id, {
            "name": "Meditar",
            "icon": "🧘",
            "habit_type": "boolean",
            "frequency": "daily",
            "section": "fire",
        })
