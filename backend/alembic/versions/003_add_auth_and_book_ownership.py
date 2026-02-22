"""add auth users and book ownership

Revision ID: 003
Revises: 002
Create Date: 2026-02-22
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _hash_password(password: str) -> str:
    iterations = 200_000
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def upgrade() -> None:
    user_role_enum = postgresql.ENUM(
        "user",
        "admin",
        name="user_role",
        create_type=False,
    )
    user_role_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("password_hash", sa.String(500), nullable=False),
        sa.Column("role", user_role_enum, nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    conn = op.get_bind()
    default_admin_id = uuid.uuid4()
    conn.execute(
        sa.text(
            """
            INSERT INTO users (id, email, full_name, password_hash, role, is_active)
            VALUES (:id, :email, :full_name, :password_hash, :role, true)
            """
        ),
        {
            "id": default_admin_id,
            "email": "admin@learner.local",
            "full_name": "Default Admin",
            "password_hash": _hash_password("admin12345"),
            "role": "admin",
        },
    )

    op.add_column("books", sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True))
    conn.execute(
        sa.text("UPDATE books SET owner_id = :owner_id WHERE owner_id IS NULL"),
        {"owner_id": default_admin_id},
    )

    inspector = sa.inspect(conn)
    for constraint in inspector.get_unique_constraints("books"):
        columns = constraint.get("column_names") or []
        if len(columns) == 1 and columns[0] == "file_hash":
            op.drop_constraint(constraint["name"], "books", type_="unique")

    op.alter_column("books", "owner_id", nullable=False)
    op.create_foreign_key(
        "fk_books_owner_id_users",
        "books",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_books_owner_created", "books", ["owner_id", "created_at"])
    op.create_unique_constraint(
        "uq_books_owner_file_hash",
        "books",
        ["owner_id", "file_hash"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_books_owner_file_hash", "books", type_="unique")
    op.drop_index("ix_books_owner_created", table_name="books")
    op.drop_constraint("fk_books_owner_id_users", "books", type_="foreignkey")
    op.drop_column("books", "owner_id")
    op.create_unique_constraint("books_file_hash_key", "books", ["file_hash"])

    op.drop_table("users")
    postgresql.ENUM(name="user_role").drop(op.get_bind(), checkfirst=True)
