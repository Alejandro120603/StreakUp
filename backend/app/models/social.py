"""
Social sharing models.

Responsibility:
- Store invite-only shared streak groups and explicit sharing memberships.
"""

from datetime import datetime, timezone

from app.extensions import db


class SharedStreakGroup(db.Model):
    """Invite-only group used for shared streak tracking."""

    __tablename__ = "shared_streak_groups"
    __table_args__ = (
        db.UniqueConstraint("invite_code", name="uq_shared_streak_groups_invite_code"),
        db.CheckConstraint("length(name) >= 3", name="ck_shared_streak_groups_name_length"),
    )

    id = db.Column(db.Integer, primary_key=True)
    owner_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = db.Column(db.String(120), nullable=False)
    invite_code = db.Column(db.String(24), nullable=False, index=True)
    active = db.Column(db.Boolean, nullable=False, default=True, server_default="1")
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("CURRENT_TIMESTAMP"),
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=db.text("CURRENT_TIMESTAMP"),
    )

    owner = db.relationship(
        "User",
        backref=db.backref("owned_shared_streak_groups", lazy=True, cascade="all, delete-orphan"),
    )


class SharedStreakMembership(db.Model):
    """Explicit user membership and progress-sharing consent for one group."""

    __tablename__ = "shared_streak_memberships"
    __table_args__ = (
        db.UniqueConstraint("group_id", "user_id", name="uq_shared_streak_membership_user"),
        db.CheckConstraint(
            "status IN ('active','left')",
            name="ck_shared_streak_memberships_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(
        db.Integer,
        db.ForeignKey("shared_streak_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = db.Column(db.String(20), nullable=False, default="active", server_default="active")
    share_progress = db.Column(db.Boolean, nullable=False, default=True, server_default="1")
    joined_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("CURRENT_TIMESTAMP"),
    )
    left_at = db.Column(db.DateTime, nullable=True)

    group = db.relationship(
        "SharedStreakGroup",
        backref=db.backref("memberships", lazy=True, cascade="all, delete-orphan"),
    )
    user = db.relationship(
        "User",
        backref=db.backref("shared_streak_memberships", lazy=True, cascade="all, delete-orphan"),
    )
