"""
Pomodoro service module.

Responsibility:
- Create and manage Pomodoro timer sessions.
"""

from datetime import datetime, timezone

from app.extensions import db
from app.models.pomodoro_session import PomodoroSession
from app.models.user_habit import UserHabit


VALID_THEMES = {"fire", "candle", "ice", "hourglass"}


def _require_int(value, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be an integer.") from exc


def create_session(user_id: int, data: dict) -> dict:
    """Create a new Pomodoro session."""
    theme = data.get("theme", "fire")
    if theme not in VALID_THEMES:
        raise ValueError(f"Invalid theme. Must be one of: {', '.join(VALID_THEMES)}")

    study_minutes = _require_int(data.get("study_minutes", 25), "study_minutes")
    break_minutes = _require_int(data.get("break_minutes", 5), "break_minutes")
    cycles = _require_int(data.get("cycles", 4), "cycles")

    if study_minutes <= 0:
        raise ValueError("study_minutes must be greater than 0.")
    if break_minutes < 0:
        raise ValueError("break_minutes must be greater than or equal to 0.")
    if cycles <= 0:
        raise ValueError("cycles must be greater than 0.")

    habit_id = data.get("habit_id")
    if habit_id is not None:
        habit_id = _require_int(habit_id, "habit_id")
        user_habit = UserHabit.query.filter_by(id=habit_id, usuario_id=user_id, activo=True).first()
        if user_habit is None:
            raise ValueError("habit_id must reference an active habit owned by the user.")

    session = PomodoroSession(
        user_id=user_id,
        habit_id=habit_id,
        theme=theme,
        study_minutes=study_minutes,
        break_minutes=break_minutes,
        cycles=cycles,
    )
    db.session.add(session)
    db.session.commit()
    return session.to_dict()


def complete_session(session_id: int, user_id: int) -> dict | None:
    """Mark a Pomodoro session as completed."""
    session = PomodoroSession.query.filter_by(id=session_id, user_id=user_id).first()
    if session is None:
        return None

    session.completed = True
    session.completed_at = datetime.now(timezone.utc)
    db.session.commit()
    return session.to_dict()


def get_user_sessions(user_id: int, limit: int = 10) -> list[dict]:
    """Return recent Pomodoro sessions for a user."""
    sessions = (
        PomodoroSession.query
        .filter_by(user_id=user_id)
        .order_by(PomodoroSession.started_at.desc())
        .limit(limit)
        .all()
    )
    return [s.to_dict() for s in sessions]
