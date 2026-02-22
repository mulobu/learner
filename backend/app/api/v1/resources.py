from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.deps import (
    get_current_user,
    get_resource_repository,
    owner_scope_for_user,
)
from app.models.user import User
from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import VideoResourceResponse

router = APIRouter(tags=["resources"])


@router.get(
    "/units/{unit_id}/resources",
    response_model=list[VideoResourceResponse],
)
async def get_unit_resources(
    unit_id: UUID,
    resource_repo: ResourceRepository = Depends(get_resource_repository),
    current_user: User = Depends(get_current_user),
):
    resources = await resource_repo.get_by_unit(
        unit_id,
        owner_id=owner_scope_for_user(current_user),
    )
    return resources
