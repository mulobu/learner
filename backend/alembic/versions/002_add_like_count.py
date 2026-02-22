"""add like_count to video_resources

Revision ID: 002
Revises: 001
Create Date: 2026-02-07
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "video_resources",
        sa.Column("like_count", sa.BigInteger(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("video_resources", "like_count")
