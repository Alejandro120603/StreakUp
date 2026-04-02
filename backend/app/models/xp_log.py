"""
XP log model placeholder module.

Responsibility:
- Persist XP-related historical records.

Should contain:
- XP log model structure.
- Relational links to users/check-ins as needed.

Should NOT contain:
- XP scoring algorithms.
- Reward policy logic.
- Endpoint implementations.
"""
from datetime import datetime, timezone
from app.extensions import db

class XpLog(db.Model):
    __tablename__ = "xp_logs"
    
    id = db.Column(db.Integer, primary_key=True)
    # BD real usa 'usuario_id', mapeamos el atributo Python 'user_id' a esa columna
    user_id = db.Column("usuario_id", db.Integer, db.ForeignKey("users.id"), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    # BD real usa 'fuente', mapeamos el atributo Python 'razon' a esa columna
    razon = db.Column("fuente", db.String(100), nullable=False)
    fecha = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="xp_logs")

