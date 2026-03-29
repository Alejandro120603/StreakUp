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
from app.models.habit import Habit
from app.models.user import User
from app.models.validation_log import ValidationLog


def get_summary(user_id: int) -> dict:
    """Return a stats summary for the user."""
    today = date_type.today()

    # Today's progress
    daily_habits = Habit.query.filter_by(user_id=user_id, frequency="daily").all()
    today_total = len(daily_habits)

    today_checkins = CheckIn.query.filter_by(user_id=user_id, date=today).count()
    today_completed = min(today_checkins, today_total)

    # Completion rate (last 7 days)
    week_ago = today - timedelta(days=7)
    week_checkins = CheckIn.query.filter(
        CheckIn.user_id == user_id,
        CheckIn.date >= week_ago,
        CheckIn.date <= today,
    ).count()
    week_possible = today_total * 7
    completion_rate = round((week_checkins / week_possible * 100)) if week_possible > 0 else 0

    # Current streak (consecutive days with at least 1 check-in)
    streak = _compute_current_streak(user_id, today)

    # XP and level from User model
    user = User.query.get(user_id)
    total_xp = user.total_xp if user else 0
    level = user.level if user else 1

    # Validations today
    validations_today = ValidationLog.query.filter_by(
        user_id=user_id, date=today, valid=True
    ).count()

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
    daily_habits = Habit.query.filter_by(user_id=user_id, frequency="daily").all()
    total_habits = len(daily_habits)

    # --- Weekly history (last 7 days, check-ins per day) ---
    day_names_es = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    weekly_history = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = CheckIn.query.filter_by(user_id=user_id, date=d).count()
        weekly_history.append({
            "date": d.isoformat(),
            "label": day_names_es[d.weekday()],
            "completed": count,
            "total": total_habits,
        })

    # --- Per-habit stats (last 7 days) ---
    week_ago = today - timedelta(days=6)
    per_habit = []
    for habit in daily_habits:
        completed_days = CheckIn.query.filter(
            CheckIn.habit_id == habit.id,
            CheckIn.user_id == user_id,
            CheckIn.date >= week_ago,
            CheckIn.date <= today,
        ).count()
        per_habit.append({
            "id": habit.id,
            "name": habit.name,
            "icon": habit.icon,
            "completed": completed_days,
            "total": 7,
            "rate": round(completed_days / 7 * 100) if completed_days > 0 else 0,
        })

    # --- 30-day streak calendar ---
    month_ago = today - timedelta(days=29)
    month_checkins = (
        db.session.query(CheckIn.date, func.count(CheckIn.id))
        .filter(
            CheckIn.user_id == user_id,
            CheckIn.date >= month_ago,
            CheckIn.date <= today,
        )
        .group_by(CheckIn.date)
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

    # --- Records ---
    current_streak = _compute_current_streak(user_id, today)
    longest_streak = _compute_longest_streak(user_id)

    # Best day (most check-ins in a single day)
    best_day_result = (
        db.session.query(CheckIn.date, func.count(CheckIn.id).label("cnt"))
        .filter(CheckIn.user_id == user_id)
        .group_by(CheckIn.date)
        .order_by(func.count(CheckIn.id).desc())
        .first()
    )
    best_day = best_day_result.cnt if best_day_result else 0

    # Total check-ins all time
    total_checkins = CheckIn.query.filter_by(user_id=user_id).count()

    # Total active days (distinct dates with check-ins)
    active_days = (
        db.session.query(func.count(func.distinct(CheckIn.date)))
        .filter(CheckIn.user_id == user_id)
        .scalar()
    ) or 0

    # Weekly completion rate
    week_checkins = CheckIn.query.filter(
        CheckIn.user_id == user_id,
        CheckIn.date >= week_ago,
        CheckIn.date <= today,
    ).count()
    week_possible = total_habits * 7
    completion_rate = round(week_checkins / week_possible * 100) if week_possible > 0 else 0

    # --- Validation stats ---
    total_validations = ValidationLog.query.filter_by(user_id=user_id, valid=True).count()
    total_validation_attempts = ValidationLog.query.filter_by(user_id=user_id).count()
    validation_rate = (
        round(total_validations / total_validation_attempts * 100)
        if total_validation_attempts > 0 else 0
    )

    # XP from user model
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
        day_checkins = CheckIn.query.filter_by(
            user_id=user_id, date=check_date
        ).count()
        if day_checkins > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            # If we're checking today and no checkins yet, check yesterday
            if check_date == today and streak == 0:
                check_date -= timedelta(days=1)
                continue
            break
    return streak


def _compute_longest_streak(user_id: int) -> int:
    """Compute the longest streak ever for a user."""
    dates = (
        db.session.query(CheckIn.date)
        .filter(CheckIn.user_id == user_id)
        .distinct()
        .order_by(CheckIn.date)
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
