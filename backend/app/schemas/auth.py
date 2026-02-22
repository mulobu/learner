from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.user import UserRole
from app.schemas.book import BookSummaryResponse


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str | None
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserWithCoursesResponse(BaseModel):
    id: UUID
    email: str
    full_name: str | None
    role: UserRole
    created_at: datetime
    books: list[BookSummaryResponse]
    total_courses: int
