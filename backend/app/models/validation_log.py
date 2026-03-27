"""
Validation log model module.

Responsibility:
- Store validation history records for habit image validations.
"""

from datetime import datetime, timezone, date as date_type

from app.extensions import db


class ValidationLog(db.Model):
    """Stores the result of an AI-powered habit validation."""

    __tablename__ = "validation_logs"
    __table_args__ = (
        db.UniqueConstraint("habit_id", "user_id", "date", name="uq_validation_habit_user_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    habit_id = db.Column(
        db.Integer, db.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date = db.Column(db.Date, nullable=False, default=lambda: date_type.today())
    valid = db.Column(db.Boolean, nullable=False)
    reason = db.Column(db.String(500), nullable=False, default="")
    confidence = db.Column(db.Float, nullable=False, default=0.0)
    xp_awarded = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    habit = db.relationship("Habit", backref=db.backref("validations", lazy=True, cascade="all, delete-orphan"))
    user = db.relationship("User", backref=db.backref("validations", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "habit_id": self.habit_id,
            "user_id": self.user_id,
            "date": self.date.isoformat() if self.date else None,
            "valid": self.valid,
            "reason": self.reason,
            "confidence": self.confidence,
            "xp_awarded": self.xp_awarded,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
