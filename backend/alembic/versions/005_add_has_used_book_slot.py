"""add has_used_book_slot to users

Revision ID: 005
Revises: 004
Create Date: 2026-02-23
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("has_used_book_slot", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Mark existing users who already have books as having used their slot
    op.execute(
        "UPDATE users SET has_used_book_slot = true "
        "WHERE id IN (SELECT DISTINCT owner_id FROM books)"
    )


def downgrade() -> None:
    op.drop_column("users", "has_used_book_slot")
