"""
Application runner for the StreakUP backend.

Responsibility:
- Expose the Flask app instance for local development and WSGI entry.

Should contain:
- App creation hook using the factory pattern.
- Minimal local execution bootstrap.

Should NOT contain:
- Domain/business logic.
- Route implementations.
- Environment-specific deployment scripts.
"""

from app import create_app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
