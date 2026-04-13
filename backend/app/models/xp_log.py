"""
XP log model module.

Responsibility:
- Persist XP-related historical records.
"""

from datetime import datetime, timezone

from app.extensions import db


VALID_XP_REASONS = ("checkin", "checkin_undo", "validation")


class XpLog(db.Model):
    """Persist historical XP mutations for a user."""

    __tablename__ = "xp_logs"
    __table_args__ = (
        db.CheckConstraint(
            "fuente IN ('checkin','checkin_undo','validation')",
            name="ck_xp_logs_fuente",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        "usuario_id",
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cantidad = db.Column(db.Integer, nullable=False)
    razon = db.Column("fuente", db.String(100), nullable=False)
    fecha = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("CURRENT_TIMESTAMP"),
    )

    user = db.relationship("User", backref="xp_logs")
