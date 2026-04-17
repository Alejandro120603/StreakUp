"""add custom frequency, min_text_length and schedule table

Revision ID: 0005_add_custom_frequency_and_schedule
Revises: e60103f7d644
Create Date: 2026-04-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0005_add_custom_frequency_and_schedule"
down_revision = "e60103f7d644"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Drop old frecuencia CHECK that only allowed daily/weekly
    op.drop_constraint(
        "ck_habitos_usuario_frecuencia",
        "habitos_usuario",
        type_="check",
    )

    # 2. Add widened CHECK that also allows 'custom'
    op.create_check_constraint(
        "ck_habitos_usuario_frecuencia",
        "habitos_usuario",
        "frecuencia IS NULL OR frecuencia IN ('daily','weekly','custom')",
    )

    # 3. Add min_text_length column
    op.add_column(
        "habitos_usuario",
        sa.Column("min_text_length", sa.Integer(), nullable=True),
    )
    op.create_check_constraint(
        "ck_habitos_usuario_min_text_length",
        "habitos_usuario",
        "min_text_length IS NULL OR min_text_length >= 0",
    )

    # 4. Create weekday schedule table
    op.create_table(
        "habitos_usuario_schedule",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("habitousuario_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["habitousuario_id"],
            ["habitos_usuario.id"],
            ondelete="CASCADE",
            name="fk_habitos_usuario_schedule_habitousuario_id",
        ),
        sa.CheckConstraint(
            "weekday BETWEEN 0 AND 6",
            name="ck_habitos_usuario_schedule_weekday",
        ),
        sa.UniqueConstraint(
            "habitousuario_id",
            "weekday",
            name="uq_habitos_usuario_schedule_day",
        ),
        sa.PrimaryKeyConstraint("id", name="habitos_usuario_schedule_pkey"),
    )
    op.create_index(
        "ix_habitos_usuario_schedule_habitousuario_id",
        "habitos_usuario_schedule",
        ["habitousuario_id"],
    )


def downgrade():
    op.drop_index(
        "ix_habitos_usuario_schedule_habitousuario_id",
        table_name="habitos_usuario_schedule",
    )
    op.drop_table("habitos_usuario_schedule")

    op.drop_constraint(
        "ck_habitos_usuario_min_text_length",
        "habitos_usuario",
        type_="check",
    )
    op.drop_column("habitos_usuario", "min_text_length")

    op.drop_constraint(
        "ck_habitos_usuario_frecuencia",
        "habitos_usuario",
        type_="check",
    )
    op.create_check_constraint(
        "ck_habitos_usuario_frecuencia",
        "habitos_usuario",
        "frecuencia IS NULL OR frecuencia IN ('daily','weekly')",
    )
