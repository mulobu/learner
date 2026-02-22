from fastapi import APIRouter, Depends

from app.core.deps import get_user_repository, require_admin
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AdminUserWithCoursesResponse
from app.schemas.book import BookSummaryResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserWithCoursesResponse])
async def list_users_with_courses(
    _: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repository),
):
    users = await user_repo.list_all_with_books()
    return [
        AdminUserWithCoursesResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            created_at=user.created_at,
            books=[BookSummaryResponse.model_validate(book) for book in user.books],
            total_courses=len(user.books),
        )
        for user in users
    ]
