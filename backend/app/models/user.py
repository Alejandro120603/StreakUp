"""
User model module.

Responsibility:
- Define persistence structure for user entities.
- Password hashing and verification at model level.
- XP and level tracking.
"""

from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db

XP_PER_LEVEL = 250


class User(db.Model):
    """User entity with secure password storage and XP tracking."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")
    total_xp = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @property
    def level(self) -> int:
        """Compute user level from total XP."""
        return self.total_xp // XP_PER_LEVEL + 1

    @property
    def xp_in_level(self) -> int:
        """XP progress within the current level."""
        return self.total_xp % XP_PER_LEVEL

    @property
    def xp_progress_pct(self) -> float:
        """Percentage progress to next level."""
        return round(self.xp_in_level / XP_PER_LEVEL * 100, 1)

    def set_password(self, password: str) -> None:
        """Hash and store the given plain-text password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plain-text password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Return a JSON-safe representation (never expose password_hash)."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "total_xp": self.total_xp,
            "level": self.level,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
