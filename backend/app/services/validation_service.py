"""
Validation service module.

Responsibility:
- Orchestrate habit validation via image analysis.
- Award XP and create check-ins for successful validations.
"""

from datetime import date as date_type

from app.extensions import db
from app.models.habit import Habit
from app.models.validation_log import ValidationLog
from app.models.checkin import CheckIn
from app.services.openai_service import analyze_habit_image

XP_PER_VALIDATION = 50


def validate_habit(user_id: int, habit_id: int, image_base64: str) -> dict:
    """Validate a habit via image analysis and award XP if valid.

    Args:
        user_id: Authenticated user ID.
        habit_id: ID of the habit to validate.
        image_base64: Base64-encoded image.

    Returns:
        dict with validation result, XP awarded, and streak info.

    Raises:
        ValueError: If habit not found or already validated today.
    """
    # 1. Verify habit belongs to user
    habit = Habit.query.filter_by(id=habit_id, user_id=user_id).first()
    if habit is None:
        raise ValueError("Hábito no encontrado.")

    today = date_type.today()

    # 2. Check for existing validation today
    existing = ValidationLog.query.filter_by(
        habit_id=habit_id, user_id=user_id, date=today
    ).first()
    if existing:
        raise ValueError("Ya validaste este hábito hoy.")

    # 3. Call OpenAI to analyze the image
    ai_result = analyze_habit_image(habit.name, image_base64)

    xp_awarded = 0
    nueva_racha = 0

    if ai_result["valido"]:
        xp_awarded = XP_PER_VALIDATION

        # 4. Create check-in if not already checked today
        existing_checkin = CheckIn.query.filter_by(
            habit_id=habit_id, user_id=user_id, date=today
        ).first()
        if not existing_checkin:
            checkin = CheckIn(
                habit_id=habit_id,
                user_id=user_id,
                date=today,
                completed=True,
            )
            db.session.add(checkin)

        # 5. Calculate current streak
        nueva_racha = _calculate_streak(habit_id, user_id, today)

    # 6. Save validation log
    log = ValidationLog(
        habit_id=habit_id,
        user_id=user_id,
        date=today,
        valid=ai_result["valido"],
        reason=ai_result["razon"],
        confidence=ai_result["confianza"],
        xp_awarded=xp_awarded,
    )
    db.session.add(log)
    db.session.commit()

    return {
        "valido": ai_result["valido"],
        "razon": ai_result["razon"],
        "confianza": ai_result["confianza"],
        "xp_ganado": xp_awarded,
        "nueva_racha": nueva_racha,
    }


def _calculate_streak(habit_id: int, user_id: int, today: date_type) -> int:
    """Calculate the current consecutive-day streak for a habit."""
    from datetime import timedelta

    checkins = (
        CheckIn.query
        .filter_by(habit_id=habit_id, user_id=user_id, completed=True)
        .order_by(CheckIn.date.desc())
        .all()
    )

    checked_dates = {c.date for c in checkins}
    # Include today since we just added the check-in
    checked_dates.add(today)

    streak = 0
    current = today
    while current in checked_dates:
        streak += 1
        current -= timedelta(days=1)

    return streak
