"""
Stats service module.

Responsibility:
- Compute user statistics: streak, today's progress, completion rate.
"""

from datetime import date as date_type, timedelta

from app.models.checkin import CheckIn
from app.models.habit import Habit


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

    return {
        "streak": streak,
        "today_completed": today_completed,
        "today_total": today_total,
        "completion_rate": completion_rate,
    }
