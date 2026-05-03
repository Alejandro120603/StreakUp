import unittest

from app import create_app
from app.extensions import db
from app.models.user import User


class ProfileTestCase(unittest.TestCase):
    def setUp(self) -> None:
        TestConfig = type(
            "ProfileTestConfig",
            (),
            {
                "SECRET_KEY": "test-secret",
                "JWT_SECRET_KEY": "test-jwt-secret-key-with-32-chars",
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
                "DEBUG": False,
                "TESTING": True,
                "ENVIRONMENT": "test",
            },
        )

        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        self.user = User(username="Daniel", email="daniel@correo.com", role="user")
        self.user.set_password("daniel-password")
        self.other_user = User(username="Gustavo", email="gustavo@correo.com", role="user")
        self.other_user.set_password("gustavo-password")
        db.session.add_all([self.user, self.other_user])
        db.session.commit()

    def tearDown(self) -> None:
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _login(self, email: str = "daniel@correo.com", password: str = "daniel-password"):
        return self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )

    def _auth_headers(self) -> dict[str, str]:
        token = self._login().get_json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_get_profile_returns_authenticated_user(self) -> None:
        response = self.client.get("/api/users/me", headers=self._auth_headers())

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["id"], self.user.id)
        self.assertEqual(payload["username"], "Daniel")
        self.assertEqual(payload["email"], "daniel@correo.com")
        self.assertNotIn("password_hash", payload)

    def test_update_profile_changes_username(self) -> None:
        response = self.client.put(
            "/api/users/me",
            json={"username": "Daniel Nuevo"},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["username"], "Daniel Nuevo")
        self.assertEqual(payload["email"], "daniel@correo.com")

        db.session.refresh(self.user)
        self.assertEqual(self.user.username, "Daniel Nuevo")

    def test_update_profile_rejects_duplicate_username(self) -> None:
        response = self.client.put(
            "/api/users/me",
            json={"username": "Gustavo"},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json(), {"error": "A user with this username already exists."})

    def test_update_profile_rejects_invalid_username(self) -> None:
        response = self.client.put(
            "/api/users/me",
            json={"username": "Al"},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"errors": ["Username must be at least 3 characters."]})

    def test_update_profile_rejects_email_change(self) -> None:
        response = self.client.put(
            "/api/users/me",
            json={"username": "Daniel", "email": "new@correo.com"},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"errors": ["Email cannot be changed from this endpoint."]})

        db.session.refresh(self.user)
        self.assertEqual(self.user.email, "daniel@correo.com")

    def test_profile_routes_require_authentication(self) -> None:
        get_response = self.client.get("/api/users/me")
        put_response = self.client.put("/api/users/me", json={"username": "Daniel Nuevo"})

        self.assertEqual(get_response.status_code, 401)
        self.assertEqual(put_response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
