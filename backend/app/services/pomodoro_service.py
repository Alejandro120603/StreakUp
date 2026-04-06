"""
Pomodoro service module.

Responsibility:
- Create and manage Pomodoro timer sessions.
"""

from datetime import datetime, timezone

from app.extensions import db
from app.models.pomodoro_session import PomodoroSession


VALID_THEMES = {"fire", "candle", "ice", "hourglass"}


def create_session(user_id: int, data: dict) -> dict:
    """Create a new Pomodoro session."""
    theme = data.get("theme", "fire")
    if theme not in VALID_THEMES:
        raise ValueError(f"Invalid theme. Must be one of: {', '.join(VALID_THEMES)}")

    session = PomodoroSession(
        user_id=user_id,
        habit_id=data.get("habit_id"),
        theme=theme,
        study_minutes=data.get("study_minutes", 25),
        break_minutes=data.get("break_minutes", 5),
        cycles=data.get("cycles", 4),
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
