from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        book_limit_reached=(
            False
            if current_user.role == UserRole.ADMIN
            else current_user.has_used_book_slot
        ),
        created_at=current_user.created_at,
    )
