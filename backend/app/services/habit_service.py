"""
Habit service module.

Responsibility:
- Host catalog and user-assignment habit use cases.
"""

from datetime import date as date_type

from app.extensions import db
from app.models.habit import Habit
from app.models.user_habit import UserHabit


_CATEGORY_PRESENTATION = {
    1: {"section": "moon", "icon": "🌙"},
    2: {"section": "plant", "icon": "🌱"},
    3: {"section": "fire", "icon": "🔥"},
}


def _get_presentation(category_id: int) -> dict[str, str]:
    return _CATEGORY_PRESENTATION.get(category_id, {"section": "fire", "icon": "🔥"})


def list_catalog_habits() -> list[dict]:
    """Return the seeded habit catalog."""
    habits = Habit.query.order_by(Habit.categoria_id, Habit.nombre).all()
    return [habit.to_dict() for habit in habits]


def get_catalog_habit(habit_id: int) -> Habit | None:
    """Return a catalog habit by id."""
    return Habit.query.filter_by(id=habit_id).first()


def list_active_user_habits(user_id: int) -> list[UserHabit]:
    """Return active user-habit assignments ordered for UI display."""
    return (
        UserHabit.query
        .filter_by(usuario_id=user_id, activo=True)
        .join(Habit, UserHabit.habito_id == Habit.id)
        .order_by(Habit.categoria_id, Habit.nombre)
        .all()
    )


def get_user_habit(habit_id: int, user_id: int, active_only: bool = True) -> UserHabit | None:
    """Return a user-habit assignment for the given user."""
    query = UserHabit.query.filter_by(id=habit_id, usuario_id=user_id)
    if active_only:
        query = query.filter_by(activo=True)
    return query.first()


def serialize_user_habit(user_habit: UserHabit) -> dict:
    """Return a frontend-compatible representation of an assigned habit."""
    catalog_habit = user_habit.habit
    presentation = _get_presentation(catalog_habit.categoria_id)
    created_at = user_habit.fecha_creacion.isoformat() if user_habit.fecha_creacion else None

    return {
        "id": user_habit.id,
        "catalog_habit_id": catalog_habit.id,
        "user_id": user_habit.usuario_id,
        "name": catalog_habit.nombre,
        "description": catalog_habit.descripcion,
        "difficulty": catalog_habit.dificultad,
        "xp_base": catalog_habit.xp_base,
        "active": bool(user_habit.activo),
        "start_date": user_habit.fecha_inicio.isoformat() if user_habit.fecha_inicio else None,
        "end_date": user_habit.fecha_fin.isoformat() if user_habit.fecha_fin else None,
        "icon": presentation["icon"],
        "habit_type": "boolean",
        "frequency": "daily",
        "section": presentation["section"],
        "target_duration": None,
        "pomodoro_enabled": False,
        "target_quantity": None,
        "target_unit": None,
        "created_at": created_at,
        "updated_at": created_at,
    }


def get_habits(user_id: int) -> list[dict]:
    """Compatibility wrapper used by the existing frontend habits list."""
    return [serialize_user_habit(user_habit) for user_habit in list_active_user_habits(user_id)]


def assign_habit_to_user(user_id: int, habito_id: int) -> dict:
    """Assign a catalog habit to a user as an active habit."""
    catalog_habit = get_catalog_habit(habito_id)
    if catalog_habit is None:
        raise LookupError("Habit catalog entry not found.")

    existing = UserHabit.query.filter_by(
        usuario_id=user_id,
        habito_id=habito_id,
        activo=True,
    ).first()
    if existing is not None:
        raise ValueError("This habit is already active for the user.")

    user_habit = UserHabit(
        usuario_id=user_id,
        habito_id=habito_id,
        fecha_inicio=date_type.today(),
        activo=True,
    )
    db.session.add(user_habit)
    db.session.commit()
    return serialize_user_habit(user_habit)


def deactivate_user_habit(habit_id: int, user_id: int) -> bool:
    """Deactivate a user-habit assignment without deleting the catalog row."""
    user_habit = get_user_habit(habit_id, user_id, active_only=True)
    if user_habit is None:
        return False

    user_habit.activo = False
    user_habit.fecha_fin = date_type.today()
    db.session.commit()
    return True
