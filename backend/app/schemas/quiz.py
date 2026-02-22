from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class QuizOption(BaseModel):
    key: str
    text: str


class QuizQuestionResponse(BaseModel):
    id: UUID
    question_text: str
    options: list[QuizOption]
    difficulty: str

    model_config = {"from_attributes": True}


class QuizResponse(BaseModel):
    unit_id: UUID
    unit_title: str
    questions: list[QuizQuestionResponse]
    best_score: float | None
    attempt_count: int


class QuizAttemptResponse(BaseModel):
    id: UUID
    unit_id: UUID
    total_questions: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AnswerSubmission(BaseModel):
    question_id: UUID
    selected_option: str


class SubmitQuizRequest(BaseModel):
    answers: list[AnswerSubmission]


class QuestionResult(BaseModel):
    question_id: UUID
    question_text: str
    options: list[QuizOption]
    selected_option: str
    correct_option: str
    is_correct: bool
    explanation: str


class QuizResultResponse(BaseModel):
    attempt_id: UUID
    score: float
    correct_count: int
    total_questions: int
    results: list[QuestionResult]


class QuizAttemptSummary(BaseModel):
    id: UUID
    score: float | None
    correct_count: int
    total_questions: int
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
