"""
Social sharing service.

Responsibility:
- Manage invite-only shared streak groups.
- Calculate privacy-safe shared progress from explicit memberships.
"""

from __future__ import annotations

import secrets
from datetime import date as date_type, datetime, timedelta, timezone

from sqlalchemy import func

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.social import SharedStreakGroup, SharedStreakMembership
from app.models.user_habit import UserHabit

INVITE_CODE_LENGTH = 10
MAX_GROUP_NAME_LENGTH = 120


class SocialPermissionError(PermissionError):
    """Raised when a user is not allowed to access a social resource."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_name(name: object) -> str:
    if not isinstance(name, str):
        raise ValueError("name is required.")
    normalized = " ".join(name.strip().split())
    if len(normalized) < 3:
        raise ValueError("name must be at least 3 characters.")
    if len(normalized) > MAX_GROUP_NAME_LENGTH:
        raise ValueError(f"name must be {MAX_GROUP_NAME_LENGTH} characters or fewer.")
    return normalized


def _normalize_invite_code(invite_code: object) -> str:
    if not isinstance(invite_code, str):
        raise ValueError("invite_code is required.")
    normalized = invite_code.strip().upper()
    if not normalized:
        raise ValueError("invite_code is required.")
    return normalized


def _generate_invite_code() -> str:
    for _ in range(10):
        code = secrets.token_urlsafe(12).replace("-", "").replace("_", "").upper()[:INVITE_CODE_LENGTH]
        if not SharedStreakGroup.query.filter_by(invite_code=code).first():
            return code
    raise RuntimeError("Could not generate a unique invite code.")


def _active_memberships(group_id: int) -> list[SharedStreakMembership]:
    return (
        SharedStreakMembership.query.filter_by(
            group_id=group_id,
            status="active",
            share_progress=True,
        )
        .order_by(SharedStreakMembership.joined_at.asc(), SharedStreakMembership.id.asc())
        .all()
    )


def _require_active_membership(user_id: int, group_id: int) -> SharedStreakMembership:
    membership = SharedStreakMembership.query.filter_by(
        group_id=group_id,
        user_id=user_id,
        status="active",
    ).first()
    if membership is None:
        raise SocialPermissionError("You are not a member of this shared streak.")
    return membership


def _completed_user_ids_for_date(user_ids: list[int], target_date: date_type) -> set[int]:
    if not user_ids:
        return set()

    rows = (
        db.session.query(UserHabit.usuario_id)
        .join(CheckIn, CheckIn.habitousuario_id == UserHabit.id)
        .filter(
            UserHabit.usuario_id.in_(user_ids),
            CheckIn.fecha == target_date,
            CheckIn.completado == True,
        )
        .group_by(UserHabit.usuario_id)
        .all()
    )
    return {int(row[0]) for row in rows}


def _first_completion_date(user_ids: list[int]) -> date_type | None:
    if not user_ids:
        return None
    return (
        db.session.query(func.min(CheckIn.fecha))
        .join(UserHabit, CheckIn.habitousuario_id == UserHabit.id)
        .filter(
            UserHabit.usuario_id.in_(user_ids),
            CheckIn.completado == True,
        )
        .scalar()
    )


def _shared_streak(memberships: list[SharedStreakMembership], today: date_type) -> dict:
    user_ids = [membership.user_id for membership in memberships]
    member_count = len(user_ids)
    today_completed_ids = _completed_user_ids_for_date(user_ids, today)
    today_completed = len(today_completed_ids)

    if member_count < 2:
        return {
            "current": 0,
            "today_completed_members": today_completed,
            "required_members": member_count,
            "ready": False,
        }

    first_date = _first_completion_date(user_ids)
    current = 0
    cursor = today
    while first_date is not None and cursor >= first_date:
        if len(_completed_user_ids_for_date(user_ids, cursor)) != member_count:
            break
        current += 1
        cursor -= timedelta(days=1)

    return {
        "current": current,
        "today_completed_members": today_completed,
        "required_members": member_count,
        "ready": member_count >= 2,
    }


def _member_payload(membership: SharedStreakMembership, today: date_type) -> dict:
    completed_today = bool(_completed_user_ids_for_date([membership.user_id], today))
    return {
        "user_id": membership.user_id,
        "username": membership.user.username,
        "status": membership.status,
        "share_progress": bool(membership.share_progress),
        "joined_at": membership.joined_at.isoformat() if membership.joined_at else None,
        "today_completed": completed_today,
    }


def _group_payload(group: SharedStreakGroup, *, include_members: bool = False) -> dict:
    today = date_type.today()
    memberships = _active_memberships(group.id)
    payload = {
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
        "owner_user_id": group.owner_user_id,
        "member_count": len(memberships),
        "shared_streak": _shared_streak(memberships, today),
        "created_at": group.created_at.isoformat() if group.created_at else None,
    }
    if include_members:
        payload["members"] = [_member_payload(membership, today) for membership in memberships]
    return payload


def create_group(user_id: int, name: object) -> dict:
    group = SharedStreakGroup(
        owner_user_id=user_id,
        name=_normalize_name(name),
        invite_code=_generate_invite_code(),
        active=True,
    )
    db.session.add(group)
    db.session.flush()
    db.session.add(
        SharedStreakMembership(
            group_id=group.id,
            user_id=user_id,
            status="active",
            share_progress=True,
        )
    )
    db.session.commit()
    return _group_payload(group, include_members=True)


def join_group(user_id: int, invite_code: object) -> dict:
    normalized_code = _normalize_invite_code(invite_code)
    group = SharedStreakGroup.query.filter_by(invite_code=normalized_code, active=True).first()
    if group is None:
        raise LookupError("Shared streak invite not found.")

    membership = SharedStreakMembership.query.filter_by(group_id=group.id, user_id=user_id).first()
    if membership is None:
        membership = SharedStreakMembership(
            group_id=group.id,
            user_id=user_id,
            status="active",
            share_progress=True,
        )
        db.session.add(membership)
    else:
        membership.status = "active"
        membership.share_progress = True
        membership.left_at = None
        membership.joined_at = _now()

    db.session.commit()
    return _group_payload(group, include_members=True)


def list_groups(user_id: int) -> list[dict]:
    memberships = (
        SharedStreakMembership.query.filter_by(
            user_id=user_id,
            status="active",
        )
        .order_by(SharedStreakMembership.joined_at.desc(), SharedStreakMembership.id.desc())
        .all()
    )
    return [
        _group_payload(membership.group, include_members=False)
        for membership in memberships
        if membership.group.active
    ]


def get_group_detail(user_id: int, group_id: int) -> dict:
    group = db.session.get(SharedStreakGroup, group_id)
    if group is None or not group.active:
        raise LookupError("Shared streak group not found.")
    _require_active_membership(user_id, group_id)
    return _group_payload(group, include_members=True)


def leave_group(user_id: int, group_id: int) -> dict:
    group = db.session.get(SharedStreakGroup, group_id)
    if group is None or not group.active:
        raise LookupError("Shared streak group not found.")
    membership = _require_active_membership(user_id, group_id)
    membership.status = "left"
    membership.share_progress = False
    membership.left_at = _now()
    db.session.commit()
    return {"left": True, "group_id": group_id}
