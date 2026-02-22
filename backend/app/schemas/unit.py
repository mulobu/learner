from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class UnitStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class UnitTreeNode(BaseModel):
    id: UUID
    title: str
    level: int
    order_index: int
    start_page: int
    end_page: int
    status: str
    is_processed: bool
    children: list["UnitTreeNode"] = []

    model_config = {"from_attributes": True}


class UnitDetailResponse(BaseModel):
    id: UUID
    book_id: UUID
    parent_id: UUID | None
    title: str
    level: int
    order_index: int
    start_page: int
    end_page: int
    status: str
    is_processed: bool
    processed_at: datetime | None
    has_quiz: bool
    has_resources: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UnitStatusUpdate(BaseModel):
    status: UnitStatus


class ProcessingStatusResponse(BaseModel):
    unit_id: UUID
    status: str  # "processing", "completed", "failed", "not_started"
    error: str | None = None
