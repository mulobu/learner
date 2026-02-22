"""add auth0 identity fields on users

Revision ID: 004
Revises: 003
Create Date: 2026-02-22
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth0_user_id", sa.String(length=128), nullable=True))
    op.create_unique_constraint("uq_users_auth0_user_id", "users", ["auth0_user_id"])
    op.alter_column("users", "password_hash", existing_type=sa.String(length=500), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(length=500), nullable=False)
    op.drop_constraint("uq_users_auth0_user_id", "users", type_="unique")
    op.drop_column("users", "auth0_user_id")
