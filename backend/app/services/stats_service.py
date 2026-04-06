"""
Stats service module.

Responsibility:
- Compute user statistics: streak, today's progress, completion rate.
"""

from datetime import date as date_type, timedelta

from sqlalchemy import func

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.user import User
from app.models.validation_log import ValidationLog
from app.services.habit_service import list_active_user_habits, _get_presentation, _HABIT_ICONS


def _user_habit_ids(user_id: int) -> list[int]:
    """Return list of active UserHabit IDs for a user."""
    return [uh.id for uh in list_active_user_habits(user_id)]


def _count_checkins_for_date(uh_ids: list[int], target_date: date_type) -> int:
    """Count check-ins for given user habit IDs on a specific date."""
    if not uh_ids:
        return 0
    return CheckIn.query.filter(
        CheckIn.habitousuario_id.in_(uh_ids),
        CheckIn.fecha == target_date,
    ).count()


def get_summary(user_id: int) -> dict:
    """Return a stats summary for the user."""
    today = date_type.today()

    uh_ids = _user_habit_ids(user_id)
    today_total = len(uh_ids)

    today_completed = min(_count_checkins_for_date(uh_ids, today), today_total)

    # Completion rate (last 7 days)
    week_checkins = 0
    for i in range(7):
        d = today - timedelta(days=i)
        week_checkins += _count_checkins_for_date(uh_ids, d)
    week_possible = today_total * 7
    completion_rate = round((week_checkins / week_possible * 100)) if week_possible > 0 else 0

    # Current streak
    streak = _compute_current_streak(uh_ids, today)

    # XP and level from user record
    user = User.query.get(user_id)
    total_xp = user.total_xp if user else 0
    level = user.level if user else 1

    # Validations done today
    validations_today = 0
    if uh_ids:
        validations_today = (
            ValidationLog.query
            .filter(
                ValidationLog.habitousuario_id.in_(uh_ids),
                ValidationLog.validado.is_(True),
                func.date(ValidationLog.fecha) == today.isoformat(),
            )
            .count()
        )

    return {
        "streak": streak,
        "today_completed": today_completed,
        "today_total": today_total,
        "completion_rate": completion_rate,
        "total_xp": total_xp,
        "level": level,
        "validations_today": validations_today,
    }


def get_detailed_stats(user_id: int) -> dict:
    """Return detailed statistics for the stats dashboard."""
    today = date_type.today()

    user_habits = list_active_user_habits(user_id)
    uh_ids = [uh.id for uh in user_habits]
    total_habits = len(uh_ids)

    # --- Weekly history (last 7 days, check-ins per day) ---
    day_names_es = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    weekly_history = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = _count_checkins_for_date(uh_ids, d)
        weekly_history.append({
            "date": d.isoformat(),
            "label": day_names_es[d.weekday()],
            "completed": count,
            "total": total_habits,
        })

    # --- Per-habit stats (last 7 days) ---
    week_ago = today - timedelta(days=6)
    per_habit = []
    for uh in user_habits:
        catalog = uh.habit
        presentation = _get_presentation(catalog.categoria_id)
        completed_days = CheckIn.query.filter(
            CheckIn.habitousuario_id == uh.id,
            CheckIn.fecha >= week_ago,
            CheckIn.fecha <= today,
        ).count()
        per_habit.append({
            "id": uh.id,
            "name": catalog.nombre,
            "icon": _HABIT_ICONS.get(catalog.id, presentation["icon"]),
            "completed": completed_days,
            "total": 7,
            "rate": round(completed_days / 7 * 100) if completed_days > 0 else 0,
        })

    # --- 30-day streak calendar ---
    month_ago = today - timedelta(days=29)
    if uh_ids:
        month_checkins = (
            db.session.query(CheckIn.fecha, func.count(CheckIn.id))
            .filter(
                CheckIn.habitousuario_id.in_(uh_ids),
                CheckIn.fecha >= month_ago,
                CheckIn.fecha <= today,
            )
            .group_by(CheckIn.fecha)
            .all()
        )
        checkin_map = {d.isoformat() if hasattr(d, 'isoformat') else str(d): c for d, c in month_checkins}
    else:
        checkin_map = {}

    calendar = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        count = checkin_map.get(d.isoformat(), 0)
        if total_habits == 0:
            intensity = 0
        elif count == 0:
            intensity = 0
        elif count < total_habits * 0.5:
            intensity = 1
        elif count < total_habits:
            intensity = 2
        else:
            intensity = 3
        calendar.append({
            "date": d.isoformat(),
            "count": count,
            "intensity": intensity,
        })

    # --- Records ---
    current_streak = _compute_current_streak(uh_ids, today)
    longest_streak = _compute_longest_streak(uh_ids)

    # Best day
    if uh_ids:
        best_day_result = (
            db.session.query(CheckIn.fecha, func.count(CheckIn.id).label("cnt"))
            .filter(CheckIn.habitousuario_id.in_(uh_ids))
            .group_by(CheckIn.fecha)
            .order_by(func.count(CheckIn.id).desc())
            .first()
        )
        best_day = best_day_result.cnt if best_day_result else 0
        total_checkins = CheckIn.query.filter(CheckIn.habitousuario_id.in_(uh_ids)).count()
    else:
        best_day = 0
        total_checkins = 0

    # Weekly completion rate
    week_checkins = 0
    for i in range(7):
        d = today - timedelta(days=i)
        week_checkins += _count_checkins_for_date(uh_ids, d)
    week_possible = total_habits * 7
    completion_rate = round(week_checkins / week_possible * 100) if week_possible > 0 else 0

    # Active days
    if uh_ids:
        active_days = (
            db.session.query(CheckIn.fecha)
            .filter(CheckIn.habitousuario_id.in_(uh_ids))
            .distinct()
            .count()
        )
    else:
        active_days = 0

    return {
        "summary": {
            "streak": current_streak,
            "completion_rate": completion_rate,
            "total_completed": total_checkins,
            "total_habits": total_habits,
        },
        "weekly_history": weekly_history,
        "per_habit": per_habit,
        "calendar": calendar,
        "records": {
            "longest_streak": longest_streak,
            "best_day": best_day,
            "current_streak": current_streak,
            "active_days": active_days,
        },
        "validations": _get_validation_stats(uh_ids),
    }


def _compute_current_streak(uh_ids: list[int], today: date_type) -> int:
    """Compute consecutive days with at least 1 check-in."""
    if not uh_ids:
        return 0

    streak = 0
    check_date = today
    while True:
        day_checkins = _count_checkins_for_date(uh_ids, check_date)
        if day_checkins > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            if check_date == today and streak == 0:
                check_date -= timedelta(days=1)
                continue
            break
    return streak


def _compute_longest_streak(uh_ids: list[int]) -> int:
    """Compute the longest streak ever for a user."""
    if not uh_ids:
        return 0

    dates = (
        db.session.query(CheckIn.fecha)
        .filter(CheckIn.habitousuario_id.in_(uh_ids))
        .distinct()
        .order_by(CheckIn.fecha)
        .all()
    )
    if not dates:
        return 0

    longest = 1
    current = 1
    sorted_dates = [d[0] for d in dates]
    for i in range(1, len(sorted_dates)):
        if sorted_dates[i] - sorted_dates[i - 1] == timedelta(days=1):
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    return longest


def _get_validation_stats(uh_ids: list[int]) -> dict:
    """Return validation counts and success rate for a user's habits."""
    if not uh_ids:
        return {"total_successful": 0, "total_attempts": 0, "success_rate": 0}

    total_attempts = ValidationLog.query.filter(
        ValidationLog.habitousuario_id.in_(uh_ids)
    ).count()

    total_successful = ValidationLog.query.filter(
        ValidationLog.habitousuario_id.in_(uh_ids),
        ValidationLog.validado.is_(True),
    ).count()

    success_rate = round(total_successful / total_attempts * 100) if total_attempts > 0 else 0

    return {
        "total_successful": total_successful,
        "total_attempts": total_attempts,
        "success_rate": success_rate,
    }
