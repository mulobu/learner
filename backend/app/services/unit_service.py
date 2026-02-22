from __future__ import annotations

import logging
import uuid

from app.core.exceptions import (
    UnitAlreadyProcessedError,
    UnitAlreadyProcessingError,
    UnitNotFoundError,
)
from app.models.quiz import QuizQuestion
from app.models.video_resource import VideoResource
from app.repositories.book_repository import BookRepository
from app.repositories.quiz_repository import QuizRepository
from app.repositories.resource_repository import ResourceRepository
from app.repositories.unit_repository import UnitRepository
from app.services.processing_tracker import ProcessingTracker
from app.utils.llm_service import LLMService
from app.utils.pdf_service import PDFService
from app.utils.video_search_service import VideoSearchService, VideoResult

TYPE_CHECKING = False
if TYPE_CHECKING:
    from app.utils.r2_service import R2Service

logger = logging.getLogger(__name__)


class UnitService:
    def __init__(
        self,
        unit_repo: UnitRepository,
        book_repo: BookRepository,
        quiz_repo: QuizRepository,
        resource_repo: ResourceRepository,
        pdf_service: PDFService,
        llm_service: LLMService,
        video_search_service: VideoSearchService,
        processing_tracker: ProcessingTracker,
        r2_service: R2Service | None = None,
        storage_mode: str = "local",
    ):
        self.unit_repo = unit_repo
        self.book_repo = book_repo
        self.quiz_repo = quiz_repo
        self.resource_repo = resource_repo
        self.pdf_service = pdf_service
        self.llm_service = llm_service
        self.video_search_service = video_search_service
        self.processing_tracker = processing_tracker
        self.r2_service = r2_service
        self.storage_mode = storage_mode

    async def get_unit_detail(
        self,
        unit_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ):
        unit = await self.unit_repo.get_by_id_with_relations(unit_id, owner_id=owner_id)
        if not unit:
            raise UnitNotFoundError(unit_id)
        return unit

    async def process_unit(
        self,
        unit_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ) -> None:
        logger.debug("Starting unit processing: unit_id=%s", unit_id)
        unit = await self.unit_repo.get_by_id(unit_id, owner_id=owner_id)
        if not unit:
            raise UnitNotFoundError(unit_id)

        if unit.is_processed:
            raise UnitAlreadyProcessedError(unit_id)

        if self.processing_tracker.is_processing(unit_id):
            raise UnitAlreadyProcessingError(unit_id)

        self.processing_tracker.start(unit_id)

        try:
            # 1. Get book to find PDF path
            book = await self.book_repo.get_by_id(unit.book_id)
            if not book:
                raise Exception(f"Book {unit.book_id} not found for unit {unit_id}")
            logger.debug(
                "Loaded book for unit: unit_id=%s book_id=%s file_path=%s",
                unit_id,
                unit.book_id,
                book.file_path,
            )

            # 2. Extract text from PDF for this unit's page range
            logger.debug(
                "Extracting text: unit_id=%s pages=%s-%s",
                unit_id,
                unit.start_page,
                unit.end_page,
            )
            if self.storage_mode == "r2":
                pdf_bytes = await self.r2_service.download_file(book.file_path)
                text = self.pdf_service.extract_text_from_bytes(
                    pdf_bytes, unit.start_page, unit.end_page
                )
            else:
                text = self.pdf_service.extract_text(
                    book.file_path, unit.start_page, unit.end_page
                )
            logger.debug(
                "Extracted text: unit_id=%s chars=%s",
                unit_id,
                len(text),
            )

            if not text.strip():
                msg = (
                    f"No text could be extracted for unit '{unit.title}' "
                    f"(pages {unit.start_page}-{unit.end_page}). "
                    f"The PDF pages may be empty or contain unsupported content."
                )
                logger.warning(msg)
                self.processing_tracker.fail(unit_id, msg)
                return

            # 3. Generate quiz questions via LLM
            logger.debug(
                "Generating quiz via LLM: unit_id=%s title=%s content_chars=%s",
                unit_id,
                unit.title,
                len(text),
            )
            generated_questions = await self.llm_service.generate_quiz(
                unit.title, text
            )
            logger.debug(
                "LLM quiz generated: unit_id=%s questions=%s",
                unit_id,
                len(generated_questions),
            )

            quiz_questions = [
                QuizQuestion(
                    unit_id=unit_id,
                    question_text=q.question_text,
                    options=[
                        {"key": "A", "text": q.option_a},
                        {"key": "B", "text": q.option_b},
                        {"key": "C", "text": q.option_c},
                        {"key": "D", "text": q.option_d},
                    ],
                    correct_option=q.correct_option,
                    explanation=q.explanation,
                    difficulty=q.difficulty,
                    order_index=i,
                )
                for i, q in enumerate(generated_questions)
            ]
            logger.debug(
                "Persisting quiz questions: unit_id=%s count=%s",
                unit_id,
                len(quiz_questions),
            )
            await self.quiz_repo.bulk_create_questions(quiz_questions)

            # 4. Generate video search queries via LLM
            logger.debug(
                "Generating video search queries via LLM: unit_id=%s title=%s",
                unit_id,
                unit.title,
            )
            search_queries = await self.llm_service.generate_search_queries(
                unit.title, text
            )
            logger.debug(
                "LLM search queries generated: unit_id=%s queries=%s",
                unit_id,
                search_queries,
            )
            if not search_queries:
                search_queries = [unit.title]

            logger.debug(
                "Searching videos: unit_id=%s query_count=%s",
                unit_id,
                len(search_queries),
            )
            video_results = await self.video_search_service.search_videos(
                search_queries,
            )
            logger.debug(
                "Video search completed: unit_id=%s results=%s",
                unit_id,
                len(video_results),
            )

            ranked_results = self._rank_video_results(video_results)[:8]
            video_resources = [
                VideoResource(
                    unit_id=unit_id,
                    source="youtube",
                    search_query=v.search_query or (search_queries[0] if search_queries else ""),
                    video_id=v.video_id,
                    title=v.title,
                    channel_name=v.channel_name,
                    thumbnail_url=v.thumbnail_url,
                    view_count=v.view_count,
                    like_count=v.like_count,
                    duration=v.duration,
                    relevance_score=v.relevance_score,
                    url=v.url,
                )
                for v in ranked_results
            ]
            if video_resources:
                logger.debug(
                    "Persisting video resources: unit_id=%s count=%s",
                    unit_id,
                    len(video_resources),
                )
                await self.resource_repo.bulk_create(video_resources)

            # 6. Mark unit as processed
            await self.unit_repo.mark_processed(unit_id)
            self.processing_tracker.complete(unit_id)
            logger.debug("Unit processing completed: unit_id=%s", unit_id)

        except Exception as e:
            logger.error(f"Unit processing failed for {unit_id}: {e}")
            self.processing_tracker.fail(unit_id, str(e))
            raise

    async def update_status(
        self,
        unit_id: uuid.UUID,
        status: str,
        owner_id: uuid.UUID | None = None,
    ) -> None:
        unit = await self.unit_repo.get_by_id(unit_id, owner_id=owner_id)
        if not unit:
            raise UnitNotFoundError(unit_id)
        await self.unit_repo.update_status(unit_id, status)

    async def get_tree_by_book(self, book_id: uuid.UUID):
        return await self.unit_repo.get_root_units_by_book(book_id)

    def _rank_video_results(self, results: list[VideoResult]) -> list[VideoResult]:
        if not results:
            return []
        ranked: list[VideoResult] = []
        for video in results:
            view_count = video.view_count or 0
            like_count = video.like_count or 0
            score = (view_count ** 0.5) * 100 + (like_count ** 0.5) * 500
            if video.seeded:
                score += 200
            video.relevance_score = score
            ranked.append(video)

        ranked.sort(key=lambda v: v.relevance_score or 0, reverse=True)
        return ranked
