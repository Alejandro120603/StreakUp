"""
Habit model module.

Responsibility:
- Define persistence structure for habit entities.
"""

from datetime import datetime, timezone

from app.extensions import db


class Habit(db.Model):
    """Habit entity linked to a user."""

    __tablename__ = "habits"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = db.Column(db.String(120), nullable=False)
    icon = db.Column(db.String(10), nullable=False, default="🔥")
    habit_type = db.Column(db.String(20), nullable=False, default="boolean")  # boolean | time | quantity
    frequency = db.Column(db.String(20), nullable=False, default="daily")  # daily | weekly
    section = db.Column(db.String(20), nullable=False, default="fire")  # fire | plant | moon

    # Time-specific fields
    target_duration = db.Column(db.Integer, nullable=True)  # minutes
    pomodoro_enabled = db.Column(db.Boolean, nullable=False, default=False)

    # Quantity-specific fields
    target_quantity = db.Column(db.Integer, nullable=True)
    target_unit = db.Column(db.String(50), nullable=True)

    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    user = db.relationship("User", backref=db.backref("habits", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self) -> dict:
        """Return a JSON-safe representation."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "icon": self.icon,
            "habit_type": self.habit_type,
            "frequency": self.frequency,
            "section": self.section,
            "target_duration": self.target_duration,
            "pomodoro_enabled": self.pomodoro_enabled,
            "target_quantity": self.target_quantity,
            "target_unit": self.target_unit,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
