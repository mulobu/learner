import uuid
from datetime import datetime, timezone

from app.core.exceptions import (
    AttemptNotFoundError,
    QuizNotFoundError,
    UnitNotFoundError,
)
from app.models.quiz import QuizAnswer, QuizAttempt
from app.repositories.quiz_repository import QuizRepository
from app.repositories.unit_repository import UnitRepository


class QuizService:
    def __init__(
        self,
        quiz_repo: QuizRepository,
        unit_repo: UnitRepository,
    ):
        self.quiz_repo = quiz_repo
        self.unit_repo = unit_repo

    async def get_quiz(
        self,
        unit_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ):
        unit = await self.unit_repo.get_by_id(unit_id, owner_id=owner_id)
        if not unit:
            raise UnitNotFoundError(unit_id)

        questions = await self.quiz_repo.get_questions_by_unit(
            unit_id,
            owner_id=owner_id,
        )
        if not questions:
            raise QuizNotFoundError(unit_id)

        best_score = await self.quiz_repo.get_best_score(unit_id, owner_id=owner_id)
        attempt_count = await self.quiz_repo.get_attempt_count(
            unit_id,
            owner_id=owner_id,
        )

        return {
            "unit_id": unit_id,
            "unit_title": unit.title,
            "questions": questions,
            "best_score": best_score,
            "attempt_count": attempt_count,
        }

    async def create_attempt(
        self,
        unit_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ) -> QuizAttempt:
        unit = await self.unit_repo.get_by_id(unit_id, owner_id=owner_id)
        if not unit:
            raise UnitNotFoundError(unit_id)

        questions = await self.quiz_repo.get_questions_by_unit(
            unit_id,
            owner_id=owner_id,
        )
        if not questions:
            raise QuizNotFoundError(unit_id)

        attempt = QuizAttempt(
            unit_id=unit_id,
            total_questions=len(questions),
            correct_count=0,
        )
        return await self.quiz_repo.create_attempt(attempt)

    async def submit_attempt(
        self,
        attempt_id: uuid.UUID,
        answers: list[dict],
        owner_id: uuid.UUID | None = None,
    ):
        attempt = await self.quiz_repo.get_attempt_by_id(attempt_id, owner_id=owner_id)
        if not attempt:
            raise AttemptNotFoundError(attempt_id)

        correct_count = 0
        answer_records: list[QuizAnswer] = []

        for ans in answers:
            question = await self.quiz_repo.get_question_by_id(ans["question_id"])
            if not question:
                continue

            is_correct = ans["selected_option"] == question.correct_option
            if is_correct:
                correct_count += 1

            answer_records.append(
                QuizAnswer(
                    attempt_id=attempt_id,
                    question_id=question.id,
                    selected_option=ans["selected_option"],
                    is_correct=is_correct,
                )
            )

        await self.quiz_repo.bulk_create_answers(answer_records)

        # Update attempt
        attempt.correct_count = correct_count
        attempt.score = (
            (correct_count / attempt.total_questions) * 100
            if attempt.total_questions > 0
            else 0
        )
        attempt.completed_at = datetime.now(timezone.utc)

        return attempt

    async def get_attempt_history(
        self,
        unit_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ):
        return await self.quiz_repo.get_attempts_by_unit(unit_id, owner_id=owner_id)

    async def get_attempt_detail(
        self,
        attempt_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ):
        attempt = await self.quiz_repo.get_attempt_by_id(attempt_id, owner_id=owner_id)
        if not attempt:
            raise AttemptNotFoundError(attempt_id)
        return attempt
