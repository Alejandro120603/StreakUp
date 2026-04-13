"""
User-habit association model module.

Responsibility:
- Represent active catalog habit assignments for a user.
"""

from datetime import datetime, timezone

from sqlalchemy import true

from app.extensions import db


class UserHabit(db.Model):
    """User-to-catalog habit assignment."""

    __tablename__ = "habitos_usuario"
    __table_args__ = (
        db.UniqueConstraint("usuario_id", "habito_id", "activo", name="uq_habitos_usuario_activo"),
        db.CheckConstraint(
            "fecha_fin IS NULL OR fecha_fin >= fecha_inicio",
            name="ck_habitos_usuario_fechas",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    habito_id = db.Column(
        db.Integer, db.ForeignKey("habitos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=True)
    activo = db.Column(db.Boolean, nullable=False, default=True, server_default=true())
    fecha_creacion = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("CURRENT_TIMESTAMP"),
    )

    user = db.relationship(
        "User",
        backref=db.backref("assigned_habits", lazy=True, cascade="all, delete-orphan"),
    )
    habit = db.relationship(
        "Habit",
        backref=db.backref("user_assignments", lazy=True, cascade="all, delete-orphan"),
    )
