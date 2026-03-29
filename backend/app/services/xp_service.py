"""
XP service module.

Responsibility:
- Award and query XP for users.
- Centralized XP management to ensure consistency.
"""

from app.extensions import db
from app.models.user import User, XP_PER_LEVEL


def award_xp(user_id: int, amount: int, source: str = "") -> dict:
    """Award (or revoke) XP to a user.

    Args:
        user_id: Target user.
        amount: XP to add (positive) or remove (negative).
        source: Description of the XP source (e.g. "checkin", "validation").

    Returns:
        dict with updated XP info.
    """
    user = User.query.get(user_id)
    if user is None:
        raise ValueError("User not found.")

    user.total_xp = max(0, user.total_xp + amount)
    db.session.commit()

    return {
        "total_xp": user.total_xp,
        "level": user.level,
        "xp_awarded": amount,
        "source": source,
    }


def get_user_xp(user_id: int) -> dict:
    """Get current XP, level, and progress for a user."""
    user = User.query.get(user_id)
    if user is None:
        raise ValueError("User not found.")

    return {
        "total_xp": user.total_xp,
        "level": user.level,
        "xp_in_level": user.xp_in_level,
        "xp_for_next_level": XP_PER_LEVEL,
        "progress_pct": user.xp_progress_pct,
    }
