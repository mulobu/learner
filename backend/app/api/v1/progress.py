from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.deps import get_book_service, get_current_user, owner_scope_for_user
from app.core.exceptions import BookNotFoundError
from app.models.user import User
from app.repositories.book_repository import BookRepository
from app.repositories.unit_repository import UnitRepository
from app.schemas.book import (
    BookProgressResponse,
    BookProgressSummary,
    BookSummaryResponse,
    DashboardResponse,
)
from app.services.book_service import BookService

router = APIRouter(tags=["progress"])


@router.get("/books/{book_id}/progress", response_model=BookProgressResponse)
async def get_book_progress(
    book_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    book_repo = BookRepository(session)
    unit_repo = UnitRepository(session)

    book = await book_repo.get_by_id(book_id, owner_id=owner_scope_for_user(current_user))
    if not book:
        raise BookNotFoundError(book_id)

    stats = await unit_repo.get_progress_stats(book_id)
    total = stats["total_units"]
    percentage = (stats["completed_units"] / total * 100) if total > 0 else 0

    return BookProgressResponse(
        book_id=book.id,
        title=book.title,
        progress=BookProgressSummary(
            total_units=stats["total_units"],
            completed_units=stats["completed_units"],
            in_progress_units=stats["in_progress_units"],
            not_started_units=stats["not_started_units"],
            completion_percentage=round(percentage, 1),
        ),
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(get_current_user),
):
    books = await book_service.list_books(owner_id=owner_scope_for_user(current_user))
    return DashboardResponse(
        books=[BookSummaryResponse.model_validate(b) for b in books],
        total_books=len(books),
    )
