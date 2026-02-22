import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Unit(BaseModel):
    __tablename__ = "units"

    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="CASCADE"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_page: Mapped[int] = mapped_column(Integer, nullable=False)
    end_page: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="not_started"
    )
    is_processed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    book: Mapped["Book"] = relationship("Book", back_populates="units")  # noqa: F821
    children: Mapped[list["Unit"]] = relationship(
        "Unit",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Unit.order_index",
    )
    parent: Mapped["Unit | None"] = relationship(
        "Unit",
        back_populates="children",
        remote_side="Unit.id",
    )
    quiz_questions: Mapped[list["QuizQuestion"]] = relationship(  # noqa: F821
        "QuizQuestion",
        back_populates="unit",
        cascade="all, delete-orphan",
    )
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(  # noqa: F821
        "QuizAttempt",
        back_populates="unit",
        cascade="all, delete-orphan",
    )
    video_resources: Mapped[list["VideoResource"]] = relationship(  # noqa: F821
        "VideoResource",
        back_populates="unit",
        cascade="all, delete-orphan",
    )
