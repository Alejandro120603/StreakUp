"""
Stats service module.

Responsibility:
- Compute user statistics: streak, today's progress, completion rate.
- Provide detailed dashboard data including XP and validation info.
"""

from datetime import date as date_type, timedelta

from sqlalchemy import func

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.user import User
from app.models.user_habit import UserHabit
from app.models.validation_log import ValidationLog
from app.services.habit_service import list_active_user_habits, serialize_user_habit


def get_summary(user_id: int) -> dict:
    """Return a stats summary for the user."""
    today = date_type.today()

    active_habits = list_active_user_habits(user_id)
    today_total = len(active_habits)

    today_checkins = (
        CheckIn.query
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(UserHabit.usuario_id == user_id, CheckIn.fecha == today)
        .count()
    )
    today_completed = min(today_checkins, today_total)

    week_ago = today - timedelta(days=7)
    week_checkins = (
        CheckIn.query
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(
            UserHabit.usuario_id == user_id,
            CheckIn.fecha >= week_ago,
            CheckIn.fecha <= today,
        )
        .count()
    )
    week_possible = today_total * 7
    completion_rate = round((week_checkins / week_possible * 100)) if week_possible > 0 else 0

    streak = _compute_current_streak(user_id, today)

    user = User.query.get(user_id)
    total_xp = user.total_xp if user else 0
    level = user.level if user else 1

    validations_today = (
        ValidationLog.query
        .join(UserHabit, ValidationLog.habitousuario_id == UserHabit.id)
        .filter(
            UserHabit.usuario_id == user_id,
            func.date(ValidationLog.fecha) == today.isoformat(),
            ValidationLog.validado.is_(True),
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
    active_habits = list_active_user_habits(user_id)
    total_habits = len(active_habits)

    day_names_es = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    weekly_history = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = (
            CheckIn.query
            .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
            .filter(UserHabit.usuario_id == user_id, CheckIn.fecha == d)
            .count()
        )
        weekly_history.append({
            "date": d.isoformat(),
            "label": day_names_es[d.weekday()],
            "completed": count,
            "total": total_habits,
        })

    week_ago = today - timedelta(days=6)
    per_habit = []
    for habit in active_habits:
        serialized_habit = serialize_user_habit(habit)
        completed_days = (
            CheckIn.query
            .filter(
                CheckIn.habitousuario_id == habit.id,
                CheckIn.fecha >= week_ago,
                CheckIn.fecha <= today,
            )
            .count()
        )
        per_habit.append({
            "id": habit.id,
            "name": serialized_habit["name"],
            "icon": serialized_habit["icon"],
            "completed": completed_days,
            "total": 7,
            "rate": round(completed_days / 7 * 100) if completed_days > 0 else 0,
        })

    month_ago = today - timedelta(days=29)
    month_checkins = (
        db.session.query(CheckIn.fecha, func.count(CheckIn.id))
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(
            UserHabit.usuario_id == user_id,
            CheckIn.fecha >= month_ago,
            CheckIn.fecha <= today,
        )
        .group_by(CheckIn.fecha)
        .all()
    )
    checkin_map = {d.isoformat(): c for d, c in month_checkins}
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

    current_streak = _compute_current_streak(user_id, today)
    longest_streak = _compute_longest_streak(user_id)

    best_day_result = (
        db.session.query(CheckIn.fecha, func.count(CheckIn.id).label("cnt"))
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(UserHabit.usuario_id == user_id)
        .group_by(CheckIn.fecha)
        .order_by(func.count(CheckIn.id).desc())
        .first()
    )
    best_day = best_day_result.cnt if best_day_result else 0

    total_checkins = (
        CheckIn.query
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(UserHabit.usuario_id == user_id)
        .count()
    )

    active_days = (
        db.session.query(func.count(func.distinct(CheckIn.fecha)))
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(UserHabit.usuario_id == user_id)
        .scalar()
    ) or 0

    week_checkins = (
        CheckIn.query
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(
            UserHabit.usuario_id == user_id,
            CheckIn.fecha >= week_ago,
            CheckIn.fecha <= today,
        )
        .count()
    )
    week_possible = total_habits * 7
    completion_rate = round(week_checkins / week_possible * 100) if week_possible > 0 else 0

    total_validations = (
        ValidationLog.query
        .join(UserHabit, ValidationLog.habitousuario_id == UserHabit.id)
        .filter(UserHabit.usuario_id == user_id, ValidationLog.validado.is_(True))
        .count()
    )
    total_validation_attempts = (
        ValidationLog.query
        .join(UserHabit, ValidationLog.habitousuario_id == UserHabit.id)
        .filter(UserHabit.usuario_id == user_id)
        .count()
    )
    validation_rate = (
        round(total_validations / total_validation_attempts * 100)
        if total_validation_attempts > 0 else 0
    )

    user = User.query.get(user_id)
    total_xp = user.total_xp if user else 0
    level = user.level if user else 1

    return {
        "summary": {
            "streak": current_streak,
            "completion_rate": completion_rate,
            "total_completed": total_checkins,
            "total_habits": total_habits,
            "total_xp": total_xp,
            "level": level,
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
        "validations": {
            "total_successful": total_validations,
            "total_attempts": total_validation_attempts,
            "success_rate": validation_rate,
        },
    }


def _compute_current_streak(user_id: int, today: date_type) -> int:
    """Compute consecutive days with at least 1 check-in."""
    streak = 0
    check_date = today
    while True:
        day_checkins = (
            CheckIn.query
            .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
            .filter(UserHabit.usuario_id == user_id, CheckIn.fecha == check_date)
            .count()
        )
        if day_checkins > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            if check_date == today and streak == 0:
                check_date -= timedelta(days=1)
                continue
            break
    return streak


def _compute_longest_streak(user_id: int) -> int:
    """Compute the longest streak ever for a user."""
    dates = (
        db.session.query(CheckIn.fecha)
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(UserHabit.usuario_id == user_id)
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
