import os
import tempfile
import unittest

from app import create_app
from app.models.user import User
from app.services.auth_service import (
    SEED_USER_EMAIL,
    SEED_USER_PASSWORD,
    ensure_seed_user,
    login_user,
)


class SeedUserTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = os.path.join(self.temp_dir.name, "seed-user-test.db")

        class TestConfig:
            SECRET_KEY = "test-secret"
            JWT_SECRET_KEY = "test-jwt-secret"
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{database_path}"
            SQLALCHEMY_TRACK_MODIFICATIONS = False
            DEBUG = False

        self.app = create_app(TestConfig)
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self) -> None:
        from app.extensions import db

        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        self.temp_dir.cleanup()

    def test_seed_user_exists_on_startup(self) -> None:
        user = User.query.filter_by(email=SEED_USER_EMAIL).first()

        self.assertIsNotNone(user)
        self.assertTrue(user.check_password(SEED_USER_PASSWORD))

    def test_seed_user_password_is_repaired_if_changed(self) -> None:
        user = User.query.filter_by(email=SEED_USER_EMAIL).first()
        self.assertIsNotNone(user)

        user.set_password("different-password")

        from app.extensions import db

        db.session.commit()

        ensure_seed_user()

        refreshed = User.query.filter_by(email=SEED_USER_EMAIL).first()
        self.assertIsNotNone(refreshed)
        self.assertTrue(refreshed.check_password(SEED_USER_PASSWORD))

    def test_seed_user_can_log_in_with_expected_credentials(self) -> None:
        result = login_user(SEED_USER_EMAIL, SEED_USER_PASSWORD)

        self.assertEqual(result["user"]["email"], SEED_USER_EMAIL)
        self.assertTrue(result["access_token"])
        self.assertTrue(result["refresh_token"])


if __name__ == "__main__":
    unittest.main()
