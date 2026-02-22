"""
LLM Service abstraction layer.

Provides a common interface for quiz generation and search query generation,
backed by Cloudflare Workers AI.
"""

import abc
import logging
from typing import Literal

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# --- Shared structured output schemas (provider-agnostic) ---


class GeneratedQuestion(BaseModel):
    question_text: str = Field(description="The question to ask")
    option_a: str = Field(description="First answer choice")
    option_b: str = Field(description="Second answer choice")
    option_c: str = Field(description="Third answer choice")
    option_d: str = Field(description="Fourth answer choice")
    correct_option: Literal["A", "B", "C", "D"]
    explanation: str = Field(description="Why the correct answer is correct")
    difficulty: Literal["easy", "medium", "hard"]


class QuizGenerationResponse(BaseModel):
    questions: list[GeneratedQuestion] = Field(min_length=3, max_length=10)


class SearchQueryResponse(BaseModel):
    queries: list[str] = Field(
        min_length=3,
        max_length=8,
        description="Optimized YouTube search queries for learning this topic",
    )


# --- Shared prompts ---

QUIZ_PROMPT_TEMPLATE = """You are an expert educator creating a quiz for students.

Topic: {unit_title}

Based on the following content, generate 5-8 multiple choice questions that test understanding of the key concepts. Vary the difficulty levels (include easy, medium, and hard questions). Each question should have exactly 4 options (A, B, C, D) with one correct answer and a clear explanation.

Content:
{content}
"""

SEARCH_QUERY_PROMPT_TEMPLATE = """You are a learning assistant that helps students find educational YouTube videos.

Topic: {unit_title}

Based on the following content, generate 5-8 optimized search queries to find the best educational YouTube videos for learning this topic.

IMPORTANT: First, mentally identify ALL the major concepts and subtopics covered in the content. Then generate queries that collectively cover as many of these concepts as possible. Do NOT focus on just one or two subtopics — spread your queries across the full breadth of the material.

Query strategy:
- Each query should target a DIFFERENT major concept or subtopic from the content
- Use direct concept queries (e.g., "anatomical planes sagittal coronal transverse explained")
- Use "tutorial/lecture" style queries for core topics (e.g., "best lecture anatomical terminology for medical students")
- Make queries specific to the actual concepts taught, not just the chapter title
- Avoid generic or overly narrow queries that miss the main material

Content:
{content}
"""


# --- Abstract base class ---


class BaseLLMService(abc.ABC):
    """Abstract interface for LLM-powered generation tasks."""

    @abc.abstractmethod
    async def generate_quiz(
        self, unit_title: str, content: str
    ) -> list[GeneratedQuestion]:
        ...

    @abc.abstractmethod
    async def generate_search_queries(
        self, unit_title: str, content: str
    ) -> list[str]:
        ...


# Re-export for backward compatibility — deps.py imports `LLMService`
# This will be resolved in deps.py via the factory, but the type alias
# keeps existing type hints working.
LLMService = BaseLLMService
