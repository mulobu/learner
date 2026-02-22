from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.unit import UnitTreeNode


class BookSummaryResponse(BaseModel):
    id: UUID
    title: str
    author: str | None
    filename: str
    total_pages: int
    toc_extracted: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BookProgressSummary(BaseModel):
    total_units: int
    completed_units: int
    in_progress_units: int
    not_started_units: int
    completion_percentage: float


class BookDetailResponse(BaseModel):
    id: UUID
    title: str
    author: str | None
    filename: str
    total_pages: int
    toc_extracted: bool
    units: list[UnitTreeNode]
    created_at: datetime

    model_config = {"from_attributes": True}


class BookProgressResponse(BaseModel):
    book_id: UUID
    title: str
    progress: BookProgressSummary


class DashboardResponse(BaseModel):
    books: list[BookSummaryResponse]
    total_books: int
