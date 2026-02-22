import asyncio
import math
import time
from collections import deque

from app.core.exceptions import RateLimitExceededError


class ProcessSubmissionRateLimiter:
    """In-memory sliding-window limiter for unit processing submissions."""

    def __init__(
        self,
        per_user_limit: int,
        global_limit: int,
        window_seconds: int = 60,
    ) -> None:
        if per_user_limit <= 0:
            raise ValueError("per_user_limit must be greater than 0")
        if global_limit <= 0:
            raise ValueError("global_limit must be greater than 0")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be greater than 0")

        self._per_user_limit = per_user_limit
        self._global_limit = global_limit
        self._window_seconds = window_seconds
        self._global_events: deque[float] = deque()
        self._user_events: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, user_key: str) -> None:
        now = time.monotonic()
        async with self._lock:
            self._prune(self._global_events, now)

            user_events = self._user_events.get(user_key)
            if user_events is None:
                user_events = deque()
                self._user_events[user_key] = user_events
            else:
                self._prune(user_events, now)
                if not user_events:
                    self._user_events.pop(user_key, None)
                    user_events = deque()
                    self._user_events[user_key] = user_events

            if len(user_events) >= self._per_user_limit:
                retry_after = self._retry_after_seconds(user_events[0], now)
                raise RateLimitExceededError(
                    "Too many unit processing requests. Please slow down.",
                    retry_after_seconds=retry_after,
                )

            if len(self._global_events) >= self._global_limit:
                retry_after = self._retry_after_seconds(self._global_events[0], now)
                raise RateLimitExceededError(
                    "Unit processing capacity is temporarily full. Please retry shortly.",
                    retry_after_seconds=retry_after,
                )

            user_events.append(now)
            self._global_events.append(now)

    def _prune(self, events: deque[float], now: float) -> None:
        cutoff = now - self._window_seconds
        while events and events[0] <= cutoff:
            events.popleft()

    def _retry_after_seconds(self, oldest_event: float, now: float) -> int:
        elapsed = now - oldest_event
        return max(1, math.ceil(self._window_seconds - elapsed))
