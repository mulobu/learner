"""Cloudflare Workers AI LLM service implementation using native JSON schema mode."""

import json
import logging

import httpx
from aiolimiter import AsyncLimiter
from pydantic import ValidationError

from app.core.exceptions import LLMServiceError
from app.utils.llm_service import (
    BaseLLMService,
    GeneratedQuestion,
    QuizGenerationResponse,
    SearchQueryResponse,
    QUIZ_PROMPT_TEMPLATE,
    SEARCH_QUERY_PROMPT_TEMPLATE,
)

logger = logging.getLogger(__name__)

_LOG_PREVIEW_CHARS = 500
# Max content chars sent to LLM (~3 chars/token → ~4000 tokens of content)
_MAX_CONTENT_CHARS = 12000

# JSON schemas for Cloudflare's response_format parameter.
QUIZ_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question_text": {"type": "string"},
                    "option_a": {"type": "string"},
                    "option_b": {"type": "string"},
                    "option_c": {"type": "string"},
                    "option_d": {"type": "string"},
                    "correct_option": {
                        "type": "string",
                        "enum": ["A", "B", "C", "D"],
                    },
                    "explanation": {"type": "string"},
                    "difficulty": {
                        "type": "string",
                        "enum": ["easy", "medium", "hard"],
                    },
                },
                "required": [
                    "question_text",
                    "option_a",
                    "option_b",
                    "option_c",
                    "option_d",
                    "correct_option",
                    "explanation",
                    "difficulty",
                ],
            },
        }
    },
    "required": ["questions"],
}

SEARCH_QUERY_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "queries": {
            "type": "array",
            "items": {"type": "string"},
        }
    },
    "required": ["queries"],
}


def _preview(text: str, limit: int = _LOG_PREVIEW_CHARS) -> str:
    if text is None:
        return ""
    return text if len(text) <= limit else f"{text[:limit]}…"


class CloudflareLLMService(BaseLLMService):
    """LLM service backed by Cloudflare Workers AI with native JSON schema mode."""

    def __init__(
        self,
        account_id: str,
        api_token: str,
        model_name: str = "@cf/openai/gpt-oss-120b",
        rate_limit: int = 10,
    ):
        self.account_id = account_id
        self.api_token = api_token
        self.model_name = model_name
        self._rate_limiter = AsyncLimiter(max_rate=rate_limit, time_period=60)
        self._base_url = (
            f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
            f"/ai/run/{model_name}"
        )

    async def _chat(
        self,
        prompt: str,
        json_schema: dict,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Send a request to Cloudflare Workers AI and return the response text."""
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": json_schema,
            },
        }

        async with self._rate_limiter:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    self._base_url,
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

                if not data.get("success", False):
                    errors = data.get("errors", [])
                    raise LLMServiceError(f"Cloudflare API error: {errors}")

                result = data["result"]
                logger.debug(
                    "Cloudflare raw result keys: %s", list(result.keys()) if isinstance(result, dict) else type(result)
                )

                # Native text-generation models return {"response": "..."}
                if isinstance(result, dict) and "response" in result:
                    return result["response"]

                # OpenAI-compatible models (e.g. gpt-oss) return
                # {"choices": [{"message": {"content": "..."}}]}
                if isinstance(result, dict) and "choices" in result:
                    choices = result["choices"]
                    if not choices:
                        raise LLMServiceError("Cloudflare returned empty choices array")
                    choice = choices[0]
                    content = choice.get("message", {}).get("content")
                    if not content:
                        finish_reason = choice.get("finish_reason", "unknown")
                        logger.error(
                            "Cloudflare returned empty content. finish_reason=%s choice=%s",
                            finish_reason,
                            json.dumps(choice, default=str)[:500],
                        )
                        raise LLMServiceError(
                            f"Cloudflare returned empty response (finish_reason={finish_reason})"
                        )
                    return content

                # Fallback: log and raise
                raise LLMServiceError(
                    f"Unexpected Cloudflare response structure: {list(result.keys()) if isinstance(result, dict) else result}"
                )

    async def generate_quiz(
        self, unit_title: str, content: str
    ) -> list[GeneratedQuestion]:
        if len(content) > _MAX_CONTENT_CHARS:
            logger.debug(
                "Truncating content for quiz: %s -> %s chars",
                len(content),
                _MAX_CONTENT_CHARS,
            )
            content = content[:_MAX_CONTENT_CHARS]
        prompt = QUIZ_PROMPT_TEMPLATE.format(unit_title=unit_title, content=content)
        logger.debug(
            "Cloudflare generate_quiz input: title=%s prompt_chars=%s preview=%s",
            unit_title,
            len(prompt),
            _preview(prompt),
        )
        try:
            raw = await self._chat(prompt, QUIZ_JSON_SCHEMA)
            logger.debug(
                "Cloudflare generate_quiz output: title=%s response_chars=%s preview=%s",
                unit_title,
                len(raw or ""),
                _preview(raw or ""),
            )
            parsed = QuizGenerationResponse.model_validate_json(raw)
            logger.debug(
                "Cloudflare generate_quiz parsed: title=%s questions=%s",
                unit_title,
                len(parsed.questions),
            )
            return parsed.questions
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(
                f"Cloudflare quiz generation failed for '{unit_title}': {e}"
            )
            raise LLMServiceError(f"Quiz generation failed: {e}")
        except httpx.HTTPError as e:
            logger.error(f"Cloudflare connection error: {e}")
            raise LLMServiceError(f"Cloudflare API error: {e}")

    async def generate_search_queries(
        self, unit_title: str, content: str
    ) -> list[str]:
        if len(content) > _MAX_CONTENT_CHARS:
            content = content[:_MAX_CONTENT_CHARS]
        prompt = SEARCH_QUERY_PROMPT_TEMPLATE.format(
            unit_title=unit_title, content=content
        )
        logger.debug(
            "Cloudflare generate_search_queries input: title=%s prompt_chars=%s preview=%s",
            unit_title,
            len(prompt),
            _preview(prompt),
        )
        try:
            raw = await self._chat(prompt, SEARCH_QUERY_JSON_SCHEMA)
            logger.debug(
                "Cloudflare generate_search_queries output: title=%s response_chars=%s preview=%s",
                unit_title,
                len(raw or ""),
                _preview(raw or ""),
            )
            parsed = SearchQueryResponse.model_validate_json(raw)
            logger.debug(
                "Cloudflare generate_search_queries parsed: title=%s queries=%s",
                unit_title,
                parsed.queries,
            )
            return parsed.queries
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(
                f"Cloudflare search query generation failed for '{unit_title}': {e}"
            )
            raise LLMServiceError(f"Search query generation failed: {e}")
        except httpx.HTTPError as e:
            logger.error(f"Cloudflare connection error: {e}")
            raise LLMServiceError(f"Cloudflare API error: {e}")
