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
from app.services.achievement_service import evaluate_and_award
from app.services.habit_service import get_user_habit
from app.services.openai_service import analyze_habit_image
from app.services.streak_service import compute_current_streak
from app.services.xp_service import award_xp
from app.services.checkin_service import is_eligible_today

_LOCAL_TIMEZONE = datetime.now().astimezone().tzinfo or timezone.utc


def _to_local_date(value: datetime | None) -> date_type | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(_LOCAL_TIMEZONE).date()


from collections.abc import Mapping

def _extract_image_payload(data: Mapping[str, object]) -> tuple[str | None, str | None]:
    """Support both legacy and current validation payload shapes."""
    image_value = data.get("image_base64") or data.get("image")
    mime_type = data.get("mime_type")

    if not isinstance(image_value, str):
        return None, None

    image_value = image_value.strip()
    normalized_mime_type = mime_type.strip() if isinstance(mime_type, str) else None

    if image_value.startswith("data:") and "," in image_value:
        metadata, encoded = image_value.split(",", 1)
        image_value = encoded.strip()

        if normalized_mime_type is None and ";base64" in metadata:
            normalized_mime_type = metadata[len("data:") :].split(";", 1)[0].strip() or None

    return image_value or None, normalized_mime_type

def validate_habit(
    user_id: int,
    habit_id: int,
    payload: Mapping[str, object],
) -> dict:
    """Validate a habit with photo evidence and award progress only on approval."""
    user_habit = get_user_habit(habit_id, user_id, active_only=True)
    if user_habit is None:
        raise ValueError("Habito no encontrado.")

    today = date_type.today()

    if not is_eligible_today(user_habit, today):
        raise ValueError("Este hábito no está programado para hoy.")

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

    val_type = user_habit.habit.tipo_validacion if not user_habit.tipo_validacion else user_habit.tipo_validacion
    
    if not val_type:
        val_type = "foto"

    try:
        evidence_metadata = {
            "validation_type": val_type,
        }
        
        is_approved = False
        reason = ""
        confidence = 1.0

        if val_type == "foto":
            image_base64, mime_type = _extract_image_payload(payload)
            if not image_base64:
                raise ValueError("image (base64) is required for photo validation.")
                
            evidence_metadata["provider"] = "openai"
            evidence_metadata["mime_type"] = mime_type or "image/jpeg"
            evidence_metadata["image_sha256"] = hashlib.sha256(image_base64.encode("utf-8")).hexdigest()
            
            log = ValidationLog(
                habitousuario_id=user_habit.id,
                tipo_validacion="foto",
                evidencia=json.dumps(evidence_metadata, ensure_ascii=True, sort_keys=True),
                status="pending",
                validado=False,
            )
            db.session.add(log)
            db.session.commit()

            try:
                habit_name = user_habit.nombre_personalizado or user_habit.habit.nombre
                ai_result = analyze_habit_image(habit_name, image_base64, mime_type=mime_type)
                is_approved = bool(ai_result["valido"])
                reason = ai_result["razon"]
                confidence = ai_result["confianza"]
            except Exception as ai_exc:
                current_app.logger.error(f"AI validation failed for log_id={log.id}: {str(ai_exc)}")
                raise

        elif val_type == "texto":
            text_content = payload.get("text_content", "")
            if not isinstance(text_content, str):
                text_content = str(text_content)
            text_content = text_content.strip()
            
            if not text_content:
                raise ValueError("Se requiere texto para validar este hábito.")
                
            min_length = user_habit.min_text_length or 0
            if len(text_content) < min_length:
                raise ValueError(f"El texto debe tener al menos {min_length} caracteres. Actualmente tiene {len(text_content)}.")

            evidence_metadata["text_content"] = text_content
            evidence_metadata["text_length"] = len(text_content)
            is_approved = True
            reason = "Texto validado correctamente."
            
            log = ValidationLog(
                habitousuario_id=user_habit.id,
                tipo_validacion="texto",
                evidencia=json.dumps(evidence_metadata, ensure_ascii=True, sort_keys=True),
                status="pending",
                validado=False,
            )
            db.session.add(log)
            
        elif val_type == "tiempo":
            duration_minutes = payload.get("duration_minutes")
            if not duration_minutes:
                raise ValueError("Se requiere la duración completada.")
                
            try:
                duration_minutes = float(duration_minutes)
            except ValueError:
                raise ValueError("La duración debe ser un número.")
                
            if user_habit.duracion_objetivo_minutos and duration_minutes < user_habit.duracion_objetivo_minutos:
                raise ValueError(f"Debes completar al menos {user_habit.duracion_objetivo_minutos} minutos. Ingresaste {duration_minutes}.")
                
            evidence_metadata["duration_minutes"] = duration_minutes
            is_approved = True
            reason = f"Completaste {duration_minutes} minutos."
            
            log = ValidationLog(
                habitousuario_id=user_habit.id,
                tipo_validacion="tiempo",
                evidencia=json.dumps(evidence_metadata, ensure_ascii=True, sort_keys=True),
                status="pending",
                validado=False,
            )
            db.session.add(log)
            
        else:
            raise ValueError(f"Tipo de validación no soportado: {val_type}")

        xp_awarded = 0
        if is_approved:
            xp_awarded = _apply_approved_progress(user_habit.id, user_id, today)

        status = "approved" if is_approved else "rejected"
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
        
        active_user_habit_ids = [
            assigned_habit.id
            for assigned_habit in user_habit.user.assigned_habits
            if assigned_habit.activo
        ]
        
        nueva_racha = compute_current_streak(active_user_habit_ids, today)
        new_achievements = evaluate_and_award(user_id, current_streak=nueva_racha)

        db.session.commit()

        return {
            "status": log.status,
            "valido": is_approved,
            "razon": reason,
            "confianza": confidence,
            "xp_ganado": xp_awarded,
            "nueva_racha": nueva_racha,
            "new_achievements": new_achievements,
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
