from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.core.database import async_session_factory

from app.core.config import settings
from app.core.deps import (
    get_current_user,
    get_llm_service,
    owner_scope_for_user,
    get_process_submission_limiter,
    get_pdf_service,
    get_processing_tracker,
    get_r2_service,
    get_unit_service,
    get_video_search_service,
)
from app.core.rate_limit import ProcessSubmissionRateLimiter
from app.models.user import User
from app.repositories.book_repository import BookRepository
from app.repositories.quiz_repository import QuizRepository
from app.repositories.resource_repository import ResourceRepository
from app.repositories.unit_repository import UnitRepository
from app.schemas.unit import (
    ProcessingStatusResponse,
    UnitDetailResponse,
    UnitStatusUpdate,
)
from app.services.processing_tracker import ProcessingTracker
from app.services.unit_service import UnitService

router = APIRouter(prefix="/units", tags=["units"])


async def process_unit_background(unit_id: UUID) -> None:
    async with async_session_factory() as session:
        unit_service = UnitService(
            unit_repo=UnitRepository(session),
            book_repo=BookRepository(session),
            quiz_repo=QuizRepository(session),
            resource_repo=ResourceRepository(session),
            pdf_service=get_pdf_service(),
            llm_service=get_llm_service(),
            video_search_service=get_video_search_service(),
            processing_tracker=get_processing_tracker(),
            r2_service=get_r2_service(),
            storage_mode=settings.STORAGE_MODE,
        )
        try:
            await unit_service.process_unit(unit_id)
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@router.get("/{unit_id}", response_model=UnitDetailResponse)
async def get_unit_detail(
    unit_id: UUID,
    unit_service: UnitService = Depends(get_unit_service),
    current_user: User = Depends(get_current_user),
):
    unit = await unit_service.get_unit_detail(
        unit_id,
        owner_id=owner_scope_for_user(current_user),
    )
    return UnitDetailResponse(
        id=unit.id,
        book_id=unit.book_id,
        parent_id=unit.parent_id,
        title=unit.title,
        level=unit.level,
        order_index=unit.order_index,
        start_page=unit.start_page,
        end_page=unit.end_page,
        status=unit.status,
        is_processed=unit.is_processed,
        processed_at=unit.processed_at,
        has_quiz=len(unit.quiz_questions) > 0,
        has_resources=len(unit.video_resources) > 0,
        created_at=unit.created_at,
    )


@router.post(
    "/{unit_id}/process",
    response_model=ProcessingStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def process_unit(
    unit_id: UUID,
    background_tasks: BackgroundTasks,
    unit_service: UnitService = Depends(get_unit_service),
    process_submission_limiter: ProcessSubmissionRateLimiter = Depends(
        get_process_submission_limiter
    ),
    current_user: User = Depends(get_current_user),
):
    # Validate the unit exists and isn't already processed
    unit = await unit_service.get_unit_detail(
        unit_id,
        owner_id=owner_scope_for_user(current_user),
    )
    await process_submission_limiter.check(str(current_user.id))

    background_tasks.add_task(process_unit_background, unit_id)

    return ProcessingStatusResponse(
        unit_id=unit_id,
        status="processing",
    )


@router.get("/{unit_id}/processing-status", response_model=ProcessingStatusResponse)
async def get_processing_status(
    unit_id: UUID,
    processing_tracker: ProcessingTracker = Depends(get_processing_tracker),
    unit_service: UnitService = Depends(get_unit_service),
    current_user: User = Depends(get_current_user),
):
    # Check in-memory tracker first
    tracker_status = processing_tracker.get_status(unit_id)
    if tracker_status:
        return ProcessingStatusResponse(
            unit_id=unit_id,
            status=tracker_status.status,
            error=tracker_status.error,
        )

    # Fall back to DB state
    unit = await unit_service.get_unit_detail(
        unit_id,
        owner_id=owner_scope_for_user(current_user),
    )
    if unit.is_processed:
        return ProcessingStatusResponse(
            unit_id=unit_id,
            status="completed",
        )

    return ProcessingStatusResponse(
        unit_id=unit_id,
        status="not_started",
    )


@router.patch("/{unit_id}/status", status_code=status.HTTP_200_OK)
async def update_unit_status(
    unit_id: UUID,
    body: UnitStatusUpdate,
    unit_service: UnitService = Depends(get_unit_service),
    current_user: User = Depends(get_current_user),
):
    await unit_service.update_status(
        unit_id,
        body.status.value,
        owner_id=owner_scope_for_user(current_user),
    )
    return {"message": "Status updated"}
