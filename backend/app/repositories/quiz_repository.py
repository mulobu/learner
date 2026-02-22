from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.book import Book
from app.models.quiz import QuizAnswer, QuizAttempt, QuizQuestion
from app.models.unit import Unit


class QuizRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # --- Questions ---

    async def bulk_create_questions(
        self, questions: list[QuizQuestion]
    ) -> list[QuizQuestion]:
        self.session.add_all(questions)
        await self.session.flush()
        return questions

    async def get_questions_by_unit(
        self,
        unit_id: UUID,
        owner_id: UUID | None = None,
    ) -> list[QuizQuestion]:
        stmt = (
            select(QuizQuestion)
            .where(QuizQuestion.unit_id == unit_id)
            .order_by(QuizQuestion.order_index)
        )
        if owner_id:
            stmt = (
                stmt.join(Unit, Unit.id == QuizQuestion.unit_id)
                .join(Book, Book.id == Unit.book_id)
                .where(Book.owner_id == owner_id)
            )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_question_by_id(self, question_id: UUID) -> QuizQuestion | None:
        result = await self.session.execute(
            select(QuizQuestion).where(QuizQuestion.id == question_id)
        )
        return result.scalar_one_or_none()

    # --- Attempts ---

    async def create_attempt(self, attempt: QuizAttempt) -> QuizAttempt:
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def get_attempt_by_id(
        self,
        attempt_id: UUID,
        owner_id: UUID | None = None,
    ) -> QuizAttempt | None:
        stmt = (
            select(QuizAttempt)
            .where(QuizAttempt.id == attempt_id)
            .options(
                selectinload(QuizAttempt.answers).selectinload(QuizAnswer.question)
            )
        )
        if owner_id:
            stmt = (
                stmt.join(Unit, Unit.id == QuizAttempt.unit_id)
                .join(Book, Book.id == Unit.book_id)
                .where(Book.owner_id == owner_id)
            )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_attempts_by_unit(
        self,
        unit_id: UUID,
        owner_id: UUID | None = None,
    ) -> list[QuizAttempt]:
        stmt = (
            select(QuizAttempt)
            .where(QuizAttempt.unit_id == unit_id)
            .order_by(QuizAttempt.created_at.desc())
        )
        if owner_id:
            stmt = (
                stmt.join(Unit, Unit.id == QuizAttempt.unit_id)
                .join(Book, Book.id == Unit.book_id)
                .where(Book.owner_id == owner_id)
            )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_best_score(
        self,
        unit_id: UUID,
        owner_id: UUID | None = None,
    ) -> float | None:
        stmt = (
            select(func.max(QuizAttempt.score))
            .select_from(QuizAttempt)
            .where(
                QuizAttempt.unit_id == unit_id,
                QuizAttempt.completed_at.is_not(None),
            )
        )
        if owner_id:
            stmt = (
                stmt.join(Unit, Unit.id == QuizAttempt.unit_id)
                .join(Book, Book.id == Unit.book_id)
                .where(Book.owner_id == owner_id)
            )
        result = await self.session.execute(stmt)
        return result.scalar()

    async def get_attempt_count(
        self,
        unit_id: UUID,
        owner_id: UUID | None = None,
    ) -> int:
        stmt = (
            select(func.count(QuizAttempt.id))
            .select_from(QuizAttempt)
            .where(
                QuizAttempt.unit_id == unit_id,
                QuizAttempt.completed_at.is_not(None),
            )
        )
        if owner_id:
            stmt = (
                stmt.join(Unit, Unit.id == QuizAttempt.unit_id)
                .join(Book, Book.id == Unit.book_id)
                .where(Book.owner_id == owner_id)
            )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    # --- Answers ---

    async def bulk_create_answers(
        self, answers: list[QuizAnswer]
    ) -> list[QuizAnswer]:
        self.session.add_all(answers)
        await self.session.flush()
        return answers
