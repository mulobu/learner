import logging
from hashlib import sha256
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth0 import decode_auth0_access_token, fetch_auth0_userinfo
from app.core.config import settings
from app.core.rate_limit import ProcessSubmissionRateLimiter
from app.core.database import get_db_session
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.repositories.book_repository import BookRepository
from app.repositories.quiz_repository import QuizRepository
from app.repositories.resource_repository import ResourceRepository
from app.repositories.unit_repository import UnitRepository
from app.repositories.user_repository import UserRepository
from app.services.book_service import BookService
from app.models.user import User, UserRole
from app.services.processing_tracker import ProcessingTracker
from app.services.quiz_service import QuizService
from app.services.unit_service import UnitService
from app.utils.llm_service import BaseLLMService
from app.utils.pdf_service import PDFService
from app.utils.r2_service import R2Service
from app.utils.video_search_service import VideoSearchService

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

# Singletons
_processing_tracker = ProcessingTracker()
_pdf_service = PDFService()
_llm_service: BaseLLMService | None = None
_video_search_service: VideoSearchService | None = None
_r2_service: R2Service | None = None
_process_submission_limiter: ProcessSubmissionRateLimiter | None = None


def get_r2_service() -> R2Service | None:
    global _r2_service
    if settings.STORAGE_MODE != "r2":
        return None
    if _r2_service is None:
        _r2_service = R2Service(
            bucket_name=settings.R2_BUCKET_NAME,
            endpoint_url=settings.R2_ENDPOINT_URL,
            access_key_id=settings.R2_ACCESS_KEY_ID,
            secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        )
    return _r2_service


def get_processing_tracker() -> ProcessingTracker:
    return _processing_tracker


def get_pdf_service() -> PDFService:
    return _pdf_service


def get_llm_service() -> BaseLLMService:
    global _llm_service
    if _llm_service is None:
        from app.utils.cloudflare_llm_service import CloudflareLLMService

        logger.info(
            f"Using Cloudflare Workers AI: {settings.CLOUDFLARE_MODEL}"
        )
        _llm_service = CloudflareLLMService(
            account_id=settings.CLOUDFLARE_ACCOUNT_ID,
            api_token=settings.CLOUDFLARE_API_TOKEN,
            model_name=settings.CLOUDFLARE_MODEL,
            rate_limit=settings.LLM_RATE_LIMIT,
        )
    return _llm_service


def get_video_search_service() -> VideoSearchService:
    global _video_search_service
    if _video_search_service is None:
        _video_search_service = VideoSearchService(
            api_key=settings.YOUTUBE_API_KEY,
            rate_limit=settings.YOUTUBE_RATE_LIMIT,
        )
    return _video_search_service


def get_process_submission_limiter() -> ProcessSubmissionRateLimiter:
    global _process_submission_limiter
    if _process_submission_limiter is None:
        _process_submission_limiter = ProcessSubmissionRateLimiter(
            per_user_limit=settings.UNIT_PROCESS_PER_USER_RATE_LIMIT,
            global_limit=settings.UNIT_PROCESS_GLOBAL_RATE_LIMIT,
            window_seconds=settings.UNIT_PROCESS_RATE_LIMIT_WINDOW_SECONDS,
        )
    return _process_submission_limiter


async def get_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> UserRepository:
    return UserRepository(session)


def _role_from_token_roles(roles: list[str]) -> UserRole:
    admin_role = settings.AUTH0_ADMIN_ROLE.strip().lower()
    return UserRole.ADMIN if admin_role in roles else UserRole.USER


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    if credentials is None:
        raise UnauthorizedError()

    token = credentials.credentials
    try:
        token_payload = decode_auth0_access_token(token)
    except ValueError as exc:
        logger.warning("Auth0 access token rejected: %s", exc)
        raise UnauthorizedError("Invalid or expired token")

    email = token_payload.email.strip().lower() if token_payload.email else None
    full_name = token_payload.name
    if not email:
        try:
            userinfo = await fetch_auth0_userinfo(token)
            raw_email = userinfo.get("email")
            if isinstance(raw_email, str) and raw_email.strip():
                email = raw_email.strip().lower()
            raw_name = userinfo.get("name")
            if isinstance(raw_name, str) and raw_name.strip():
                full_name = raw_name.strip()
        except Exception:
            email = None

    if not email:
        synthetic = sha256(token_payload.sub.encode("utf-8")).hexdigest()[:16]
        email = f"{synthetic}@auth0.local"

    role = _role_from_token_roles(token_payload.roles)

    user = await user_repo.get_by_auth0_user_id(token_payload.sub)
    if not user:
        existing_by_email = await user_repo.get_by_email(email)
        if existing_by_email and (
            existing_by_email.auth0_user_id
            and existing_by_email.auth0_user_id != token_payload.sub
        ):
            raise UnauthorizedError("Email is already linked to another account")
        if existing_by_email:
            user = existing_by_email
            user.auth0_user_id = token_payload.sub
        else:
            user = User(
                auth0_user_id=token_payload.sub,
                email=email,
                full_name=full_name,
                role=role,
                is_active=True,
            )
            user = await user_repo.create(user)

    changed = False
    if user.email != email:
        user.email = email
        changed = True
    if full_name and user.full_name != full_name:
        user.full_name = full_name
        changed = True
    if user.role != role:
        user.role = role
        changed = True
    if changed:
        await user_repo.session.flush()

    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Admin access required")
    return current_user


def owner_scope_for_user(user: User) -> UUID | None:
    return None if user.role == UserRole.ADMIN else user.id


async def get_book_service(
    session: AsyncSession = Depends(get_db_session),
    pdf_service: PDFService = Depends(get_pdf_service),
) -> BookService:
    book_repo = BookRepository(session)
    unit_repo = UnitRepository(session)
    return BookService(
        book_repo,
        unit_repo,
        pdf_service,
        r2_service=get_r2_service(),
        storage_mode=settings.STORAGE_MODE,
    )


async def get_unit_service(
    session: AsyncSession = Depends(get_db_session),
    pdf_service: PDFService = Depends(get_pdf_service),
    llm_service: BaseLLMService = Depends(get_llm_service),
    video_search_service: VideoSearchService = Depends(get_video_search_service),
    processing_tracker: ProcessingTracker = Depends(get_processing_tracker),
) -> UnitService:
    unit_repo = UnitRepository(session)
    book_repo = BookRepository(session)
    quiz_repo = QuizRepository(session)
    resource_repo = ResourceRepository(session)
    return UnitService(
        unit_repo=unit_repo,
        book_repo=book_repo,
        quiz_repo=quiz_repo,
        resource_repo=resource_repo,
        pdf_service=pdf_service,
        llm_service=llm_service,
        video_search_service=video_search_service,
        processing_tracker=processing_tracker,
        r2_service=get_r2_service(),
        storage_mode=settings.STORAGE_MODE,
    )


async def get_quiz_service(
    session: AsyncSession = Depends(get_db_session),
) -> QuizService:
    quiz_repo = QuizRepository(session)
    unit_repo = UnitRepository(session)
    return QuizService(quiz_repo, unit_repo)


async def get_resource_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ResourceRepository:
    return ResourceRepository(session)
