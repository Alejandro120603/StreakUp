"""
XP service placeholder module.

Responsibility:
- Host XP-related domain use cases.

Should contain:
- XP awarding/revocation orchestration logic.
- Collaboration with persistence layer abstractions.

Should NOT contain:
- Route handlers.
- Direct schema validation concerns.
- UI or transport-level formatting.
"""
from datetime import timedelta
from datetime import date as date_type
from sqlalchemy import func
from app.extensions import db
from app.models.user import User
from app.models.xp_log import XpLog

XP_PER_LEVEL = 250

def award_xp(user_id: int, amount: int, reason: str = "validation"):
    """Award XP to a user and handle leveling up."""
    user = User.query.get(user_id)
    if not user:
        raise ValueError("User not found.")

    user.total_xp += amount
    user.xp_in_level += amount

    while user.xp_in_level >= XP_PER_LEVEL:
        user.xp_in_level -= XP_PER_LEVEL
        user.level += 1

    log = XpLog(
        user_id=user_id,
        cantidad=amount,
        razon=reason
    )
    db.session.add(log)
    db.session.commit()

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


def get_xp_history(user_id: int, days: int = 7) -> list[dict]:
    """Return XP earned per day for the last N days.

    Args:
        user_id: Target user.
        days: Number of days to look back (default 7).

    Returns:
        List of dicts with date, label (day name), and xp earned.
    """
    today = date_type.today()
    start = today - timedelta(days=days - 1)

    rows = (
        db.session.query(
            func.date(XpLog.fecha).label("day"),
            func.sum(XpLog.cantidad).label("total"),
        )
        .filter(
            XpLog.user_id == user_id,
            XpLog.cantidad > 0,  # only count positive awards (ignore revocations)
            func.date(XpLog.fecha) >= start.isoformat(),
            func.date(XpLog.fecha) <= today.isoformat(),
        )
        .group_by(func.date(XpLog.fecha))
        .all()
    )

    xp_map: dict[str, int] = {row.day: row.total for row in rows}

    day_names_es = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    result = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        key = d.isoformat()
        result.append({
            "date": key,
            "label": day_names_es[d.weekday()],
            "xp": xp_map.get(key, 0),
        })

    return result
