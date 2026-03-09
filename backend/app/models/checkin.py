"""
Check-in model module.

Responsibility:
- Store daily check-in records for habits.
"""

from datetime import datetime, timezone, date as date_type

from app.extensions import db


class CheckIn(db.Model):
    """Daily check-in record for a habit."""

    __tablename__ = "checkins"
    __table_args__ = (
        db.UniqueConstraint("habit_id", "date", name="uq_checkin_habit_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    habit_id = db.Column(
        db.Integer, db.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date = db.Column(db.Date, nullable=False, default=lambda: date_type.today())
    completed = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    habit = db.relationship("Habit", backref=db.backref("checkins", lazy=True, cascade="all, delete-orphan"))
    user = db.relationship("User", backref=db.backref("checkins", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "habit_id": self.habit_id,
            "user_id": self.user_id,
            "date": self.date.isoformat() if self.date else None,
            "completed": self.completed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
