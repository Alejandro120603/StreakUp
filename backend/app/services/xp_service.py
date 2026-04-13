"""
XP service module.

Responsibility:
- Host XP-related domain use cases.
- Keep user XP aggregates consistent with xp_logs.
"""

from collections.abc import Iterable
from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import func

from app.extensions import db
from app.models.user import User
from app.models.xp_log import XpLog

XP_PER_LEVEL = 250
_XP_REASON_ALIASES = {
    "checkin": "checkin",
    "checkin_undo": "checkin_undo",
    "validation": "validation",
    "uncheck": "checkin_undo",
    "revocation": "checkin_undo",
}


def normalize_xp_reason(reason: str) -> str:
    """Return the canonical persisted reason for an XP log entry."""
    normalized = reason.strip().lower()
    canonical = _XP_REASON_ALIASES.get(normalized)
    if canonical is None:
        raise ValueError(f"Unsupported XP reason: {reason}")
    return canonical


def calculate_level_state(total_xp: int) -> tuple[int, int]:
    """Return the level and in-level XP for a total XP amount."""
    bounded_total = max(0, int(total_xp))
    level = (bounded_total // XP_PER_LEVEL) + 1
    xp_in_level = bounded_total % XP_PER_LEVEL
    return level, xp_in_level


def recompute_user_xp(user_id: int, *, commit: bool = True) -> User:
    """Rebuild a user's aggregate XP fields from xp_logs."""
    user = db.session.get(User, user_id)
    if user is None:
        raise ValueError("User not found.")

    total_xp = (
        db.session.query(func.coalesce(func.sum(XpLog.cantidad), 0))
        .filter(XpLog.user_id == user_id)
        .scalar()
    )
    user.total_xp = max(0, int(total_xp or 0))
    user.level, user.xp_in_level = calculate_level_state(user.total_xp)

    if commit:
        db.session.commit()
    else:
        db.session.flush()

    return user


def recompute_all_users_xp(user_ids: Iterable[int] | None = None, *, commit: bool = True) -> int:
    """Rebuild aggregate XP fields for every selected user."""
    query = db.session.query(User.id).order_by(User.id)
    if user_ids is not None:
        ids = [int(user_id) for user_id in user_ids]
        if not ids:
            return 0
        query = query.filter(User.id.in_(ids))

    selected_ids = [row[0] for row in query.all()]
    for user_id in selected_ids:
        recompute_user_xp(user_id, commit=False)

    if commit:
        db.session.commit()

    return len(selected_ids)


def award_xp(user_id: int, amount: int, reason: str = "validation", *, commit: bool = True) -> None:
    """Award XP to a user and handle leveling up."""
    if amount < 0:
        raise ValueError("XP amount must be non-negative.")

    user = db.session.get(User, user_id)
    if not user:
        raise ValueError("User not found.")

    canonical_reason = normalize_xp_reason(reason)

    user.total_xp += amount
    user.level, user.xp_in_level = calculate_level_state(user.total_xp)

    log = XpLog(user_id=user_id, cantidad=amount, razon=canonical_reason)
    db.session.add(log)

    if commit:
        db.session.commit()
    else:
        db.session.flush()


def revoke_xp(user_id: int, amount: int, reason: str = "checkin_undo", *, commit: bool = True) -> None:
    """Revoke XP from a user and handle leveling down."""
    if amount < 0:
        raise ValueError("XP amount must be non-negative.")

    user = db.session.get(User, user_id)
    if not user:
        raise ValueError("User not found.")

    canonical_reason = normalize_xp_reason(reason)

    user.total_xp = max(0, user.total_xp - amount)
    user.level, user.xp_in_level = calculate_level_state(user.total_xp)

    log = XpLog(user_id=user_id, cantidad=-amount, razon=canonical_reason)
    db.session.add(log)

    if commit:
        db.session.commit()
    else:
        db.session.flush()


def get_user_xp(user_id: int) -> dict:
    """Get current XP, level, and progress for a user."""
    user = db.session.get(User, user_id)
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
    """Return XP earned per day for the last N days."""
    today = date_type.today()
    start = today - timedelta(days=days - 1)

    rows = (
        db.session.query(
            func.date(XpLog.fecha).label("day"),
            func.sum(XpLog.cantidad).label("total"),
        )
        .filter(
            XpLog.user_id == user_id,
            XpLog.cantidad > 0,
            func.date(XpLog.fecha) >= start.isoformat(),
            func.date(XpLog.fecha) <= today.isoformat(),
        )
        .group_by(func.date(XpLog.fecha))
        .all()
    )

    xp_map: dict[str, int] = {row.day: row.total for row in rows}

    day_names_es = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]
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
