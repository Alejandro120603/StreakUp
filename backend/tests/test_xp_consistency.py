import os
import tempfile
import unittest
from datetime import date
from unittest.mock import patch

from app import create_app
from app.extensions import db
from app.models.checkin import CheckIn
from app.models.habit import Category, Habit
from app.models.user import User
from app.models.user_habit import UserHabit
from app.models.validation_log import ValidationLog
from app.models.xp_log import XpLog
from app.services.checkin_service import toggle_checkin
from app.services.validation_service import validate_habit


class XpConsistencyTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database_path = os.path.join(self.temp_dir.name, "xp-consistency.db")
        self.config = type(
            "XpConsistencyConfig",
            (),
            {
                "SECRET_KEY": "test-secret",
                "JWT_SECRET_KEY": "test-jwt-secret-key-with-32-chars",
                "SQLALCHEMY_DATABASE_URI": f"sqlite:///{self.database_path}",
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                "DEBUG": False,
                "TESTING": True,
                "ENVIRONMENT": "test",
            },
        )

        self.app = create_app(self.config)
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        category = Category(nombre="Salud y Bienestar", descripcion="Hábitos físicos y mentales")
        db.session.add(category)
        db.session.commit()

        self.user = User(username="Daniel", email="daniel@correo.com", role="user")
        self.user.set_password("daniel-password")
        db.session.add(self.user)
        db.session.commit()

        self.habit = Habit(
            categoria_id=category.id,
            nombre="Meditar 5-10 min",
            descripcion="Relajación mental",
            dificultad="facil",
            xp_base=10,
        )
        db.session.add(self.habit)
        db.session.commit()

        self.user_habit = UserHabit(
            usuario_id=self.user.id,
            habito_id=self.habit.id,
            fecha_inicio=date.today(),
            activo=True,
        )
        db.session.add(self.user_habit)
        db.session.commit()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        self.temp_dir.cleanup()

    def test_validation_creates_photo_award_when_no_checkin_exists(self) -> None:
        with patch(
            "app.services.validation_service.analyze_habit_image",
            return_value={"valido": True, "razon": "evidencia valida", "confianza": 0.9},
        ):
            result = validate_habit(self.user.id, self.user_habit.id, "image-base64")

        db.session.refresh(self.user)
        checkin = CheckIn.query.filter_by(habitousuario_id=self.user_habit.id).one()

        self.assertEqual(result["xp_ganado"], 15)
        self.assertEqual(checkin.xp_ganado, 15)
        self.assertEqual(self.user.total_xp, 15)
        self.assertEqual(sum(log.cantidad for log in XpLog.query.all()), 15)
        self.assertEqual(ValidationLog.query.count(), 1)

    def test_validation_after_checkin_awards_only_missing_bonus_delta(self) -> None:
        toggle_checkin(self.user.id, self.user_habit.id)
        db.session.refresh(self.user)
        self.assertEqual(self.user.total_xp, 10)

        with patch(
            "app.services.validation_service.analyze_habit_image",
            return_value={"valido": True, "razon": "evidencia valida", "confianza": 0.95},
        ):
            result = validate_habit(self.user.id, self.user_habit.id, "image-base64")

        db.session.refresh(self.user)
        checkin = CheckIn.query.filter_by(habitousuario_id=self.user_habit.id).one()
        log_amounts = [log.cantidad for log in XpLog.query.order_by(XpLog.id).all()]

        self.assertEqual(result["xp_ganado"], 5)
        self.assertEqual(checkin.xp_ganado, 15)
        self.assertEqual(self.user.total_xp, 15)
        self.assertEqual(log_amounts, [10, 5])
        self.assertEqual(ValidationLog.query.count(), 1)


if __name__ == "__main__":
    unittest.main()
