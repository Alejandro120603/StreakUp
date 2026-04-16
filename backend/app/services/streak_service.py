"""
Streak service placeholder module.

Responsibility:
- Host streak computation and streak-related domain workflows.

Should contain:
- Streak progression/reset business rules.
- Domain orchestration helpers.

Should NOT contain:
- Flask blueprint code.
- Raw database schema declarations.
- Cross-cutting infrastructure setup.
"""

from datetime import date as date_type, datetime, timedelta, timezone

from app.models.checkin import CheckIn
from app.models.validation_log import ValidationLog

_LOCAL_TIMEZONE = datetime.now().astimezone().tzinfo or timezone.utc


def _to_local_date(value: datetime | None) -> date_type | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(_LOCAL_TIMEZONE).date()


def has_rejected_validation_today(uh_ids: list[int], today: date_type) -> bool:
    """Return whether any active habit has a rejected validation today."""
    if not uh_ids:
        return False

    # Filter by status and date range at the database level for efficiency
    start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    end_of_day = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc)

    rejected_exists = ValidationLog.query.filter(
        ValidationLog.habitousuario_id.in_(uh_ids),
        ValidationLog.status == "rejected",
        ValidationLog.fecha >= start_of_day,
        ValidationLog.fecha <= end_of_day,
    ).first()

    return rejected_exists is not None


def compute_current_streak(uh_ids: list[int], today: date_type) -> int:
    """Compute consecutive approved days unless today's validation was rejected."""
    if not uh_ids:
        return 0
    if has_rejected_validation_today(uh_ids, today):
        return 0

    streak = 0
    check_date = today
    while True:
        day_checkins = CheckIn.query.filter(
            CheckIn.habitousuario_id.in_(uh_ids),
            CheckIn.fecha == check_date,
        ).count()
        if day_checkins > 0:
            streak += 1
            check_date -= timedelta(days=1)
            continue

        if check_date == today and streak == 0:
            check_date -= timedelta(days=1)
            continue
        break

    return streak


def compute_longest_streak(uh_ids: list[int]) -> int:
    """Compute longest streak from approved progress rows only."""
    if not uh_ids:
        return 0

    dates = (
        CheckIn.query.with_entities(CheckIn.fecha)
        .filter(CheckIn.habitousuario_id.in_(uh_ids))
        .distinct()
        .order_by(CheckIn.fecha)
        .all()
    )
    if not dates:
        return 0

    sorted_dates = [row[0] for row in dates]
    longest = 1
    current = 1
    for index in range(1, len(sorted_dates)):
        if sorted_dates[index] - sorted_dates[index - 1] == timedelta(days=1):
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    return longest
