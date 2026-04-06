"""
Catalog bootstrap service module.

Responsibility:
- Define the canonical hosted catalog data.
- Seed that catalog idempotently without demo users.
"""

from app.extensions import db
from app.models.habit import Category, Habit


DEFAULT_CATEGORIES = (
    {"id": 1, "nombre": "Salud y Bienestar", "descripcion": "Hábitos físicos y mentales"},
    {"id": 2, "nombre": "Productividad", "descripcion": "Enfoque y rendimiento"},
    {"id": 3, "nombre": "Orden", "descripcion": "Organización personal"},
)

DEFAULT_HABITS = (
    {
        "id": 1,
        "categoria_id": 1,
        "nombre": "Beber 2L de agua",
        "descripcion": "Mantener hidratación diaria",
        "dificultad": "facil",
        "xp_base": 10,
    },
    {
        "id": 2,
        "categoria_id": 1,
        "nombre": "Ejercicio 30 min",
        "descripcion": "Actividad física diaria",
        "dificultad": "media",
        "xp_base": 20,
    },
    {
        "id": 3,
        "categoria_id": 1,
        "nombre": "Comida saludable",
        "descripcion": "Alimentación balanceada",
        "dificultad": "media",
        "xp_base": 15,
    },
    {
        "id": 4,
        "categoria_id": 1,
        "nombre": "Meditar 5-10 min",
        "descripcion": "Relajación mental",
        "dificultad": "facil",
        "xp_base": 10,
    },
    {
        "id": 5,
        "categoria_id": 1,
        "nombre": "Día sin quejas",
        "descripcion": "Control emocional",
        "dificultad": "dificil",
        "xp_base": 25,
    },
    {
        "id": 6,
        "categoria_id": 2,
        "nombre": "Trabajo profundo 60 min",
        "descripcion": "Sesión sin distracciones",
        "dificultad": "dificil",
        "xp_base": 30,
    },
    {
        "id": 7,
        "categoria_id": 2,
        "nombre": "Completar tarea clave",
        "descripcion": "Tarea importante del día",
        "dificultad": "media",
        "xp_base": 20,
    },
    {
        "id": 8,
        "categoria_id": 2,
        "nombre": "Empezar antes de las 9am",
        "descripcion": "Disciplina matutina",
        "dificultad": "media",
        "xp_base": 15,
    },
    {
        "id": 9,
        "categoria_id": 2,
        "nombre": "Leer 20 min",
        "descripcion": "Lectura diaria",
        "dificultad": "facil",
        "xp_base": 10,
    },
    {
        "id": 10,
        "categoria_id": 2,
        "nombre": "Practicar idioma",
        "descripcion": "Aprendizaje lingüístico",
        "dificultad": "media",
        "xp_base": 15,
    },
    {
        "id": 11,
        "categoria_id": 3,
        "nombre": "Tender la cama",
        "descripcion": "Orden básico diario",
        "dificultad": "facil",
        "xp_base": 5,
    },
    {
        "id": 12,
        "categoria_id": 3,
        "nombre": "Dormir",
        "descripcion": "Orden básico diario",
        "dificultad": "facil",
        "xp_base": 5,
    },
)


def seed_catalog() -> dict[str, int]:
    """Insert the canonical catalog rows without creating demo users."""
    categories_created = 0
    habits_created = 0

    for row in DEFAULT_CATEGORIES:
        category = db.session.get(Category, row["id"])
        if category is None:
            category = Category(id=row["id"])
            db.session.add(category)
            categories_created += 1

        category.nombre = row["nombre"]
        category.descripcion = row["descripcion"]

    for row in DEFAULT_HABITS:
        habit = db.session.get(Habit, row["id"])
        if habit is None:
            habit = Habit(id=row["id"])
            db.session.add(habit)
            habits_created += 1

        habit.categoria_id = row["categoria_id"]
        habit.nombre = row["nombre"]
        habit.descripcion = row["descripcion"]
        habit.dificultad = row["dificultad"]
        habit.xp_base = row["xp_base"]

    db.session.commit()

    return {
        "categories_created": categories_created,
        "habits_created": habits_created,
        "total_categories": Category.query.count(),
        "total_habits": Habit.query.count(),
    }
