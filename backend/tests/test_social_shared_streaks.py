from datetime import date, timedelta

import pytest

from app import create_app
from app.extensions import db
from app.models.checkin import CheckIn
from app.models.habit import Category, Habit
from app.models.user import User
from app.models.user_habit import UserHabit
from app.services.social_service import (
    SocialPermissionError,
    create_group,
    get_group_detail,
    join_group,
    leave_group,
)


@pytest.fixture
def app():
    instance = create_app()
    instance.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })
    with instance.app_context():
        db.create_all()
        yield instance
        db.session.remove()
        db.drop_all()


@pytest.fixture
def seeded(app):
    with app.app_context():
        category = Category(nombre="Social")
        db.session.add(category)
        db.session.flush()

        habit = Habit(
            categoria_id=category.id,
            nombre="Privado",
            dificultad="facil",
            xp_base=10,
        )
        db.session.add(habit)
        db.session.flush()

        users = []
        user_habits = []
        today = date.today()
        for index in range(3):
            user = User(username=f"user{index}", email=f"user{index}@test.com")
            user.set_password("password")
            db.session.add(user)
            db.session.flush()
            users.append(user)

            user_habit = UserHabit(
                usuario_id=user.id,
                habito_id=habit.id,
                fecha_inicio=today - timedelta(days=5),
                activo=True,
            )
            db.session.add(user_habit)
            db.session.flush()
            user_habits.append(user_habit)

        db.session.commit()
        return {
            "users": [user.id for user in users],
            "user_habits": [user_habit.id for user_habit in user_habits],
        }


def _add_checkin(user_habit_id: int, day: date):
    db.session.add(CheckIn(habitousuario_id=user_habit_id, fecha=day, completado=True, xp_ganado=10))
    db.session.commit()


def test_create_group_creates_owner_membership(app, seeded):
    with app.app_context():
        owner_id = seeded["users"][0]
        group = create_group(owner_id, "Equipo privado")

    assert group["name"] == "Equipo privado"
    assert group["member_count"] == 1
    assert group["shared_streak"]["ready"] is False
    assert group["members"][0]["user_id"] == owner_id
    assert "@" not in str(group)


def test_join_by_invite_is_idempotent_and_reactivates(app, seeded):
    with app.app_context():
        owner_id, member_id = seeded["users"][:2]
        group = create_group(owner_id, "Equipo privado")
        joined = join_group(member_id, group["invite_code"])
        left = leave_group(member_id, group["id"])
        rejoined = join_group(member_id, group["invite_code"])

    assert joined["member_count"] == 2
    assert left == {"left": True, "group_id": group["id"]}
    assert rejoined["member_count"] == 2
    assert sorted(member["user_id"] for member in rejoined["members"]) == sorted([owner_id, member_id])


def test_non_member_cannot_read_group_detail(app, seeded):
    with app.app_context():
        owner_id, _, outsider_id = seeded["users"]
        group = create_group(owner_id, "Equipo privado")

        with pytest.raises(SocialPermissionError):
            get_group_detail(outsider_id, group["id"])


def test_shared_streak_counts_consecutive_all_member_days_and_resets(app, seeded):
    with app.app_context():
        owner_id, member_id = seeded["users"][:2]
        owner_habit, member_habit = seeded["user_habits"][:2]
        today = date.today()
        group = create_group(owner_id, "Equipo privado")
        join_group(member_id, group["invite_code"])

        for offset in (2, 1, 0):
            _add_checkin(owner_habit, today - timedelta(days=offset))
            _add_checkin(member_habit, today - timedelta(days=offset))

        detail = get_group_detail(owner_id, group["id"])
        assert detail["shared_streak"]["current"] == 3
        assert detail["shared_streak"]["today_completed_members"] == 2

        db.session.delete(CheckIn.query.filter_by(habitousuario_id=member_habit, fecha=today - timedelta(days=1)).one())
        db.session.commit()

        reset_detail = get_group_detail(owner_id, group["id"])
        assert reset_detail["shared_streak"]["current"] == 1


def test_group_detail_omits_private_habit_and_email_fields(app, seeded):
    with app.app_context():
        owner_id, member_id = seeded["users"][:2]
        group = create_group(owner_id, "Equipo privado")
        detail = join_group(member_id, group["invite_code"])

    serialized = str(detail)
    assert "email" not in serialized
    assert "@test.com" not in serialized
    assert "Privado" not in serialized
    assert "members" in detail
