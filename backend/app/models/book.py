import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Book(BaseModel):
    __tablename__ = "books"
    __table_args__ = (
        UniqueConstraint("owner_id", "file_hash", name="uq_books_owner_file_hash"),
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    author: Mapped[str | None] = mapped_column(String(500), nullable=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    total_pages: Mapped[int] = mapped_column(Integer, nullable=False)
    toc_extracted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    owner: Mapped["User"] = relationship("User", back_populates="books")  # noqa: F821

    units: Mapped[list["Unit"]] = relationship(  # noqa: F821
        "Unit",
        back_populates="book",
        cascade="all, delete-orphan",
        order_by="Unit.order_index",
    )
