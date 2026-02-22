from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.deps import get_current_user, get_quiz_service, owner_scope_for_user
from app.models.user import User
from app.schemas.quiz import (
    AnswerSubmission,
    QuestionResult,
    QuizAttemptResponse,
    QuizAttemptSummary,
    QuizOption,
    QuizQuestionResponse,
    QuizResponse,
    QuizResultResponse,
    SubmitQuizRequest,
)
from app.services.quiz_service import QuizService

router = APIRouter(tags=["quizzes"])


@router.get("/units/{unit_id}/quiz", response_model=QuizResponse)
async def get_quiz(
    unit_id: UUID,
    quiz_service: QuizService = Depends(get_quiz_service),
    current_user: User = Depends(get_current_user),
):
    data = await quiz_service.get_quiz(
        unit_id,
        owner_id=owner_scope_for_user(current_user),
    )
    questions = [
        QuizQuestionResponse(
            id=q.id,
            question_text=q.question_text,
            options=[QuizOption(**opt) for opt in q.options],
            difficulty=q.difficulty,
        )
        for q in data["questions"]
    ]
    return QuizResponse(
        unit_id=data["unit_id"],
        unit_title=data["unit_title"],
        questions=questions,
        best_score=data["best_score"],
        attempt_count=data["attempt_count"],
    )


@router.post(
    "/units/{unit_id}/quiz/attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_attempt(
    unit_id: UUID,
    quiz_service: QuizService = Depends(get_quiz_service),
    current_user: User = Depends(get_current_user),
):
    attempt = await quiz_service.create_attempt(
        unit_id,
        owner_id=owner_scope_for_user(current_user),
    )
    return attempt


@router.post("/quiz/attempts/{attempt_id}/submit", response_model=QuizResultResponse)
async def submit_attempt(
    attempt_id: UUID,
    body: SubmitQuizRequest,
    quiz_service: QuizService = Depends(get_quiz_service),
    current_user: User = Depends(get_current_user),
):
    answers_dicts = [
        {"question_id": a.question_id, "selected_option": a.selected_option}
        for a in body.answers
    ]
    attempt = await quiz_service.submit_attempt(
        attempt_id,
        answers_dicts,
        owner_id=owner_scope_for_user(current_user),
    )

    # Build detailed results
    results: list[QuestionResult] = []
    for answer in attempt.answers:
        question = answer.question
        results.append(
            QuestionResult(
                question_id=question.id,
                question_text=question.question_text,
                options=[QuizOption(**opt) for opt in question.options],
                selected_option=answer.selected_option,
                correct_option=question.correct_option,
                is_correct=answer.is_correct,
                explanation=question.explanation,
            )
        )

    return QuizResultResponse(
        attempt_id=attempt.id,
        score=attempt.score or 0,
        correct_count=attempt.correct_count,
        total_questions=attempt.total_questions,
        results=results,
    )


@router.get(
    "/units/{unit_id}/quiz/attempts",
    response_model=list[QuizAttemptSummary],
)
async def get_attempt_history(
    unit_id: UUID,
    quiz_service: QuizService = Depends(get_quiz_service),
    current_user: User = Depends(get_current_user),
):
    return await quiz_service.get_attempt_history(
        unit_id,
        owner_id=owner_scope_for_user(current_user),
    )


@router.get("/quiz/attempts/{attempt_id}", response_model=QuizResultResponse)
async def get_attempt_detail(
    attempt_id: UUID,
    quiz_service: QuizService = Depends(get_quiz_service),
    current_user: User = Depends(get_current_user),
):
    attempt = await quiz_service.get_attempt_detail(
        attempt_id,
        owner_id=owner_scope_for_user(current_user),
    )

    results: list[QuestionResult] = []
    for answer in attempt.answers:
        question = answer.question
        results.append(
            QuestionResult(
                question_id=question.id,
                question_text=question.question_text,
                options=[QuizOption(**opt) for opt in question.options],
                selected_option=answer.selected_option,
                correct_option=question.correct_option,
                is_correct=answer.is_correct,
                explanation=question.explanation,
            )
        )

    return QuizResultResponse(
        attempt_id=attempt.id,
        score=attempt.score or 0,
        correct_count=attempt.correct_count,
        total_questions=attempt.total_questions,
        results=results,
    )
