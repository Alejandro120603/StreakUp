"""
Habit model module.

Responsibility:
- Define persistence structure for catalog habit entities.
"""

from app.extensions import db


class Category(db.Model):
    """Habit catalog category used only for foreign-key metadata."""

    __tablename__ = "categorias"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)


class Habit(db.Model):
    """Catalog habit entity loaded from the seeded SQLite schema."""

    __tablename__ = "habitos"

    id = db.Column(db.Integer, primary_key=True)
    categoria_id = db.Column(
        db.Integer, db.ForeignKey("categorias.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nombre = db.Column(db.String(120), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    dificultad = db.Column(db.String(20), nullable=False)
    xp_base = db.Column(db.Integer, nullable=False)

    def to_dict(self) -> dict:
        """Return a JSON-safe representation for catalog consumers."""
        return {
            "id": self.id,
            "category_id": self.categoria_id,
            "name": self.nombre,
            "description": self.descripcion,
            "difficulty": self.dificultad,
            "xp_base": self.xp_base,
        }
