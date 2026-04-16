"""
Validation service module.

Responsibility:
- Orchestrate photo-only habit validation via image analysis.
- Award XP and create check-ins only for approved validations.
"""

import hashlib
import json
from datetime import date as date_type, datetime, timezone

from flask import current_app

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.user_habit import UserHabit
from app.models.validation_log import ValidationLog
from app.services.habit_service import get_user_habit
from app.services.openai_service import analyze_habit_image
from app.services.streak_service import compute_current_streak
from app.services.xp_service import award_xp

_LOCAL_TIMEZONE = datetime.now().astimezone().tzinfo or timezone.utc


def _to_local_date(value: datetime | None) -> date_type | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(_LOCAL_TIMEZONE).date()


def validate_habit(
    user_id: int,
    habit_id: int,
    image_base64: str,
    *,
    mime_type: str | None = None,
) -> dict:
    """Validate a habit with photo evidence and award progress only on approval."""
    user_habit = get_user_habit(habit_id, user_id, active_only=True)
    if user_habit is None:
        raise ValueError("Habito no encontrado.")

    today = date_type.today()

    existing = next(
        (
            validation
            for validation in ValidationLog.query.filter(
                ValidationLog.habitousuario_id == user_habit.id,
            )
            .order_by(ValidationLog.fecha.desc())
            .all()
            if _to_local_date(validation.fecha) == today
        ),
        None,
    )
    if existing:
        raise ValueError("Ya validaste este habito hoy.")

    try:
        evidence_metadata = {
            "provider": "openai",
            "mime_type": mime_type or "image/jpeg",
            "image_sha256": hashlib.sha256(image_base64.encode("utf-8")).hexdigest(),
        }
        # 1. Validation attempt is recorded as pending
        log = ValidationLog(
            habitousuario_id=user_habit.id,
            tipo_validacion="foto",
            evidencia=json.dumps(evidence_metadata, ensure_ascii=True, sort_keys=True),
            status="pending",
            validado=False,
        )
        db.session.add(log)
        db.session.commit()  # Commit to record the attempt even if AI fails

        # 2. Validation result is determined
        try:
            habit_name = user_habit.nombre_personalizado or user_habit.habit.nombre
            ai_result = analyze_habit_image(habit_name, image_base64, mime_type=mime_type)
            is_approved = bool(ai_result["valido"])
            status = "approved" if is_approved else "rejected"
            reason = ai_result["razon"]
            confidence = ai_result["confianza"]
        except Exception as ai_exc:
            current_app.logger.error(f"AI validation failed for log_id={log.id}: {str(ai_exc)}")
            # In case of AI failure, log it but don't grant progress
            # We keep it as pending or mark as error? 
            # The task says "pending grants nothing", so we can leave it or mark as rejected.
            # Let's mark as rejected/error to be safe, or just re-raise if we want to bubble up 500.
            # However, the user request asks for "validation attempt is recorded".
            # If we re-raise, the user gets 500. If we catch, we can return a friendly error.
            raise

        # 3. Only then are streak/XP/progress effects applied
        xp_awarded = 0
        if is_approved:
            xp_awarded = _apply_approved_progress(user_habit.id, user_id, today)

        log.status = status
        log.validado = is_approved
        evidence_metadata.update(
            {
                "reason": reason,
                "confidence": confidence,
                "xp_awarded": xp_awarded,
            }
        )
        log.evidencia = json.dumps(evidence_metadata, ensure_ascii=True, sort_keys=True)
        
        # Streak calculation - always based on current DB state after progress application
        active_user_habit_ids = [
            assigned_habit.id
            for assigned_habit in user_habit.user.assigned_habits
            if assigned_habit.activo
        ]
        
        nueva_racha = compute_current_streak(active_user_habit_ids, today)
        db.session.commit()

        return {
            "status": log.status,
            "valido": is_approved,
            "razon": reason,
            "confianza": confidence,
            "xp_ganado": xp_awarded,
            "nueva_racha": nueva_racha,
        }
    except Exception:
        current_app.logger.exception(
            "Validation transaction failed for user_id=%s habit_id=%s",
            user_id,
            habit_id,
        )
        db.session.rollback()
        raise


def _apply_approved_progress(user_habit_id: int, user_id: int, today: date_type) -> int:
    """Materialize one approved progress row and award XP at most once per day."""
    existing_checkin = CheckIn.query.filter_by(
        habitousuario_id=user_habit_id,
        fecha=today,
    ).first()
    if existing_checkin:
        return 0

    user_habit = db.session.get(UserHabit, user_habit_id)
    base_xp = user_habit.habit.xp_base if user_habit and user_habit.habit else 10
    awarded_xp = int(base_xp * 1.5)
    checkin = CheckIn(
        habitousuario_id=user_habit_id,
        fecha=today,
        completado=True,
        xp_ganado=awarded_xp,
    )
    db.session.add(checkin)
    if awarded_xp > 0:
        award_xp(user_id, awarded_xp, "validation", commit=False)
    return awarded_xp
