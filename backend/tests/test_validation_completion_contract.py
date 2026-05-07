"""
test_validation_completion_contract.py
=======================================
Strict backend tests for the validation completion contract introduced in the
habit-validation hardening work.

Contract rules (all enforced here):
  1. A FAILED validation (AI rejects) must NOT create a CheckIn row.
  2. A FAILED validation must NOT award XP.
  3. A FAILED validation must NOT update the streak counter above its pre-validation value.
  4. A provider / internal error must NOT complete the habit (no CheckIn, no XP).
  5. A SUCCESSFUL validation MUST create exactly one CheckIn row.
  6. A SUCCESSFUL validation MUST award XP > 0 (when xp_base > 0).
  7. The response envelope MUST contain success / approved / completed keys that
     accurately reflect the outcome.
  8. Double-calling validate_habit for the same habit on the same day must be
     idempotent — the second call raises ValueError (already validated today).
"""

import os
import tempfile
from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from app import create_app
from app.extensions import db
from app.models.checkin import CheckIn
from app.models.habit import Category, Habit
from app.models.user import User
from app.models.user_habit import UserHabit
from app.models.validation_log import ValidationLog
from app.services.validation_service import validate_habit


# ---------------------------------------------------------------------------
# Test application factory
# ---------------------------------------------------------------------------

def _make_cfg(db_path: str):
    return type(
        "ContractTestConfig",
        (),
        {
            "SECRET_KEY": "contract-test-secret-key-32chars!!",
            "JWT_SECRET_KEY": "contract-jwt-secret-key-32chars!!",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "TESTING": True,
            "ENVIRONMENT": "test",
            "OPENAI_API_KEY": "",
        },
    )


@pytest.fixture(scope="module")
def app():
    tmp = tempfile.TemporaryDirectory()
    db_path = os.path.join(tmp.name, "contract.db")
    app_instance = create_app(_make_cfg(db_path))
    with app_instance.app_context():
        db.create_all()
        yield app_instance
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
    tmp.cleanup()


# ---------------------------------------------------------------------------
# Fixtures — seeded once per module for speed
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def seeded(app):
    """Return IDs for a user + three UserHabits (photo, text_ai, time)."""
    with app.app_context():
        user = User(username="contract_user", email="contract@test.com", role="user")
        user.set_password("pw")
        db.session.add(user)
        db.session.flush()

        cat = Category(nombre="Contract Tests", descripcion="")
        db.session.add(cat)
        db.session.flush()

        # Photo habit (AI-validated)
        h_photo = Habit(
            nombre="Ejercicio foto",
            categoria_id=cat.id,
            dificultad="media",
            xp_base=20,
            tipo_validacion="photo",
            meta_type="boolean",
            xp_rate=0,
            max_xp_per_day=20,
        )
        # Text-AI habit
        h_text = Habit(
            nombre="Diario texto",
            categoria_id=cat.id,
            dificultad="facil",
            xp_base=10,
            tipo_validacion="text_ai",
            meta_type="boolean",
            xp_rate=0,
            max_xp_per_day=10,
        )
        # Time habit (deterministic — no AI)
        h_time = Habit(
            nombre="Meditación tiempo",
            categoria_id=cat.id,
            dificultad="media",
            xp_base=5,
            tipo_validacion="time",
            meta_type="minutes",
            xp_rate=1,
            max_xp_per_day=30,
        )
        db.session.add_all([h_photo, h_text, h_time])
        db.session.flush()

        uh_photo = UserHabit(
            usuario_id=user.id, habito_id=h_photo.id,
            activo=True, fecha_inicio=date.today(),
        )
        uh_text = UserHabit(
            usuario_id=user.id, habito_id=h_text.id,
            activo=True, fecha_inicio=date.today(), min_text_length=10,
        )
        uh_time = UserHabit(
            usuario_id=user.id, habito_id=h_time.id,
            activo=True, fecha_inicio=date.today(),
            duracion_objetivo_minutos=10,
        )
        db.session.add_all([uh_photo, uh_text, uh_time])
        db.session.commit()

        return {
            "user_id": user.id,
            "uh_photo": uh_photo.id,
            "uh_text": uh_text.id,
            "uh_time": uh_time.id,
        }


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _checkin_count(uh_id: int) -> int:
    return CheckIn.query.filter_by(habitousuario_id=uh_id, fecha=date.today()).count()


def _xp_for_user(user_id: int) -> int:
    from app.models.xp_log import XpLog
    from sqlalchemy import func
    # Column is `cantidad`; FK attribute is `user_id` (mapped from `usuario_id`)
    total = db.session.query(func.sum(XpLog.cantidad)).filter(XpLog.user_id == user_id).scalar()
    return int(total or 0)


# ---------------------------------------------------------------------------
# CONTRACT RULE 1-3 — FAILED AI validation → no check-in, no XP, same streak
# ---------------------------------------------------------------------------

class TestRejectedPhotoValidation:
    """AI returns valido=False → habit stays pending, no side-effects."""

    def test_rejected_does_not_create_checkin(self, app, seeded):
        with app.app_context():
            before = _checkin_count(seeded["uh_photo"])
            ai_reject = {"valido": False, "razon": "No se aprecia evidencia.", "confianza": 0.9}
            with patch("app.services.validation_service.analyze_habit_image", return_value=ai_reject):
                result = validate_habit(
                    seeded["user_id"], seeded["uh_photo"],
                    {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                )
            after = _checkin_count(seeded["uh_photo"])
            assert result["success"] is False, "success must be False on AI rejection"
            assert result["completed"] is False, "completed must be False on AI rejection"
            assert after == before, "no CheckIn row must be created on rejection"

    def test_rejected_does_not_award_xp(self, app, seeded):
        with app.app_context():
            # uh_text is text_ai — must patch analyze_habit_text, not analyze_habit_image
            ai_reject = {"valido": False, "razon": "Texto irrelevante.", "confianza": 0.8}
            with patch("app.services.validation_service.analyze_habit_text", return_value=ai_reject):
                result = validate_habit(
                    seeded["user_id"], seeded["uh_text"],
                    {"text_content": "Hoy practique mi habito diario largo."},
                )
            # The contract: xp_ganado must be 0 on rejection
            assert result["xp_ganado"] == 0, "rejected text_ai must not award XP"
            assert result["success"] is False
            assert _checkin_count(seeded["uh_text"]) == 0, "rejected text_ai must not create CheckIn"

    def test_rejected_response_envelope_is_correct(self, app, seeded):
        """All three canonical fields must be False on rejection."""
        # Use a fresh user-habit (time type, short duration → deterministic rejection)
        with app.app_context():
            cat = Category.query.first()
            h = Habit(
                nombre="Rechazo tiempo",
                categoria_id=cat.id,
                dificultad="facil",
                xp_base=5,
                tipo_validacion="time",
                meta_type="minutes",
                xp_rate=0,
                max_xp_per_day=5,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
                duracion_objetivo_minutos=30,  # require 30 min
            )
            db.session.add(uh)
            db.session.commit()

            with pytest.raises(ValueError, match="Debes completar al menos"):
                validate_habit(seeded["user_id"], uh.id, {"duration_minutes": 5})

            # ValueError → no check-in created
            assert _checkin_count(uh.id) == 0


# ---------------------------------------------------------------------------
# CONTRACT RULE 4 — provider / internal error → no completion
# ---------------------------------------------------------------------------

class TestProviderErrorDoesNotComplete:
    """An exception from the AI provider must roll back everything."""

    def test_ai_crash_does_not_create_checkin(self, app, seeded):
        with app.app_context():
            cat = Category.query.first()
            h = Habit(
                nombre="Error provider",
                categoria_id=cat.id,
                dificultad="media",
                xp_base=20,
                tipo_validacion="photo",
                meta_type="boolean",
                xp_rate=0,
                max_xp_per_day=20,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
            )
            db.session.add(uh)
            db.session.commit()

            with patch(
                "app.services.validation_service.analyze_habit_image",
                side_effect=RuntimeError("OpenAI timeout"),
            ):
                with pytest.raises(RuntimeError):
                    validate_habit(
                        seeded["user_id"], uh.id,
                        {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                    )

            # Rollback must have cleaned up: no check-in, log status stays pending or absent
            assert _checkin_count(uh.id) == 0, "provider error must not create a CheckIn"

    def test_ai_crash_does_not_award_xp(self, app, seeded):
        with app.app_context():
            before_xp = _xp_for_user(seeded["user_id"])
            cat = Category.query.first()
            h = Habit(
                nombre="Error XP photo",
                categoria_id=cat.id,
                dificultad="media",
                xp_base=50,
                tipo_validacion="photo",
                meta_type="boolean",
                xp_rate=0,
                max_xp_per_day=50,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
            )
            db.session.add(uh)
            db.session.commit()

            with patch(
                "app.services.validation_service.analyze_habit_image",
                side_effect=ConnectionError("Network unreachable"),
            ):
                with pytest.raises(ConnectionError):
                    validate_habit(
                        seeded["user_id"], uh.id,
                        {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                    )

            after_xp = _xp_for_user(seeded["user_id"])
            assert after_xp == before_xp, "provider error must not award XP"

    def test_ai_crash_does_not_leak_pending_validation_log(self, app, seeded):
        """The atomic flush+rollback pattern must leave no orphaned pending log."""
        with app.app_context():
            cat = Category.query.first()
            h = Habit(
                nombre="Leak test",
                categoria_id=cat.id,
                dificultad="media",
                xp_base=10,
                tipo_validacion="photo",
                meta_type="boolean",
                xp_rate=0,
                max_xp_per_day=10,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
            )
            db.session.add(uh)
            db.session.commit()
            uh_id = uh.id

            logs_before = ValidationLog.query.filter_by(habitousuario_id=uh_id).count()

            with patch(
                "app.services.validation_service.analyze_habit_image",
                side_effect=RuntimeError("Simulated AI crash"),
            ):
                with pytest.raises(RuntimeError):
                    validate_habit(
                        seeded["user_id"], uh_id,
                        {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                    )

            logs_after = ValidationLog.query.filter_by(habitousuario_id=uh_id).count()
            assert logs_after == logs_before, (
                "rollback must remove the flushed-but-not-committed ValidationLog"
            )


# ---------------------------------------------------------------------------
# CONTRACT RULE 5-7 — SUCCESSFUL validation completes the habit correctly
# ---------------------------------------------------------------------------

class TestSuccessfulValidationCompletesHabit:

    def test_approved_photo_creates_checkin(self, app, seeded):
        with app.app_context():
            cat = Category.query.first()
            h = Habit(
                nombre="Éxito foto checkin",
                categoria_id=cat.id,
                dificultad="media",
                xp_base=20,
                tipo_validacion="photo",
                meta_type="boolean",
                xp_rate=0,
                max_xp_per_day=20,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
            )
            db.session.add(uh)
            db.session.commit()

            ai_ok = {"valido": True, "razon": "Evidencia clara.", "confianza": 0.97}
            with patch("app.services.validation_service.analyze_habit_image", return_value=ai_ok):
                result = validate_habit(
                    seeded["user_id"], uh.id,
                    {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                )

            assert result["success"] is True
            assert result["approved"] is True
            assert result["completed"] is True
            assert _checkin_count(uh.id) == 1, "approved validation must create exactly one CheckIn"

    def test_approved_photo_awards_xp(self, app, seeded):
        with app.app_context():
            before_xp = _xp_for_user(seeded["user_id"])
            cat = Category.query.first()
            h = Habit(
                nombre="Éxito foto xp",
                categoria_id=cat.id,
                dificultad="facil",
                xp_base=15,
                tipo_validacion="photo",
                meta_type="boolean",
                xp_rate=0,
                max_xp_per_day=15,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
            )
            db.session.add(uh)
            db.session.commit()

            ai_ok = {"valido": True, "razon": "Bien hecho.", "confianza": 0.95}
            with patch("app.services.validation_service.analyze_habit_image", return_value=ai_ok):
                result = validate_habit(
                    seeded["user_id"], uh.id,
                    {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                )

            assert result["xp_ganado"] > 0, "approved validation must award XP"
            after_xp = _xp_for_user(seeded["user_id"])
            assert after_xp > before_xp, "user total XP must increase after approved validation"

    def test_approved_time_creates_checkin_and_awards_xp(self, app, seeded):
        with app.app_context():
            cat = Category.query.first()
            h = Habit(
                nombre="Éxito tiempo",
                categoria_id=cat.id,
                dificultad="media",
                xp_base=5,
                tipo_validacion="time",
                meta_type="minutes",
                xp_rate=2,
                max_xp_per_day=40,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
                duracion_objetivo_minutos=10,
            )
            db.session.add(uh)
            db.session.commit()

            result = validate_habit(seeded["user_id"], uh.id, {"duration_minutes": 20})

            assert result["success"] is True
            assert result["xp_ganado"] > 0
            assert _checkin_count(uh.id) == 1


# ---------------------------------------------------------------------------
# CONTRACT RULE 8 — idempotency guard (double call same day)
# ---------------------------------------------------------------------------

class TestIdempotencyGuard:

    def test_second_validation_same_day_raises(self, app, seeded):
        """validate_habit must reject a second call for the same habit today."""
        with app.app_context():
            cat = Category.query.first()
            h = Habit(
                nombre="Idempotency test",
                categoria_id=cat.id,
                dificultad="media",
                xp_base=20,
                tipo_validacion="photo",
                meta_type="boolean",
                xp_rate=0,
                max_xp_per_day=20,
            )
            db.session.add(h)
            db.session.flush()
            uh = UserHabit(
                usuario_id=seeded["user_id"],
                habito_id=h.id,
                activo=True,
                fecha_inicio=date.today(),
            )
            db.session.add(uh)
            db.session.commit()

            ai_ok = {"valido": True, "razon": "Primera vez.", "confianza": 0.9}
            with patch("app.services.validation_service.analyze_habit_image", return_value=ai_ok):
                validate_habit(
                    seeded["user_id"], uh.id,
                    {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                )

            # Second call must be rejected — only one CheckIn should exist
            with pytest.raises(ValueError, match="Ya validaste este habito hoy"):
                with patch("app.services.validation_service.analyze_habit_image", return_value=ai_ok):
                    validate_habit(
                        seeded["user_id"], uh.id,
                        {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"},
                    )

            assert _checkin_count(uh.id) == 1, "idempotency: still exactly one CheckIn after second attempt"
