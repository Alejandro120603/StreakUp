"""
Validation service module.

Responsibility:
- Orchestrate photo-only habit validation via image analysis.
- Award XP and create check-ins for successful validations.
"""

from datetime import date as date_type

from sqlalchemy import func

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.validation_log import ValidationLog
from app.services.habit_service import get_user_habit
from app.services.openai_service import analyze_habit_image
from app.services.xp_service import award_xp

def validate_habit(user_id: int, habit_id: int, image_base64: str) -> dict:
    """Validate a habit with photo evidence and award only the missing XP delta.

    Args:
        user_id: Authenticated user ID.
        habit_id: ID of the habit to validate.
        image_base64: Base64-encoded image.

    Returns:
        dict with validation result, XP awarded, and streak info.

    Raises:
        ValueError: If habit not found or already validated today.
    """
    user_habit = get_user_habit(habit_id, user_id, active_only=True)
    if user_habit is None:
        raise ValueError("Hábito no encontrado.")

    today = date_type.today()

    existing = (
        ValidationLog.query
        .filter(
            ValidationLog.habitousuario_id == user_habit.id,
            func.date(ValidationLog.fecha) == today.isoformat(),
        )
        .first()
    )
    if existing:
        raise ValueError("Ya validaste este hábito hoy.")

    ai_result = analyze_habit_image(user_habit.habit.nombre, image_base64)

    xp_awarded = 0
    nueva_racha = 0

    if ai_result["valido"]:
        base_xp = user_habit.habit.xp_base if user_habit.habit else 10
        target_xp = int(base_xp * 1.5)  # 50% bonus for photo validation

        existing_checkin = CheckIn.query.filter_by(
            habitousuario_id=user_habit.id,
            fecha=today,
        ).first()
        if not existing_checkin:
            checkin = CheckIn(
                habitousuario_id=user_habit.id,
                fecha=today,
                completado=True,
                xp_ganado=target_xp,
            )
            db.session.add(checkin)
            xp_awarded = target_xp
        else:
            xp_awarded = max(0, target_xp - existing_checkin.xp_ganado)
            if xp_awarded > 0:
                existing_checkin.completado = True
                existing_checkin.xp_ganado = target_xp

        nueva_racha = _calculate_streak(user_habit.id, today)

        if xp_awarded > 0:
            award_xp(user_id, xp_awarded, "validation")

    log = ValidationLog(
        habitousuario_id=user_habit.id,
        tipo_validacion="foto",
        evidencia=image_base64,
        validado=ai_result["valido"],
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


def _calculate_streak(habit_id: int, today: date_type) -> int:
    """Calculate the current consecutive-day streak for a habit."""
    from datetime import timedelta

    checkins = (
        CheckIn.query
        .filter_by(habitousuario_id=habit_id, completado=True)
        .order_by(CheckIn.fecha.desc())
        .all()
    )

    checked_dates = {checkin.fecha for checkin in checkins}
    checked_dates.add(today)

    streak = 0
    current = today
    while current in checked_dates:
        streak += 1
        current -= timedelta(days=1)

    return streak
