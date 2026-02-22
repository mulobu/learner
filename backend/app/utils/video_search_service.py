import asyncio
import logging
import re
from dataclasses import dataclass

from aiolimiter import AsyncLimiter
from googleapiclient.discovery import build

from app.core.exceptions import VideoSearchError

logger = logging.getLogger(__name__)


@dataclass
class VideoResult:
    video_id: str
    title: str
    channel_name: str
    thumbnail_url: str | None
    view_count: int | None
    like_count: int | None
    duration: str | None
    url: str
    search_query: str
    seeded: bool = False
    relevance_score: float | None = None


class VideoSearchService:
    def __init__(self, api_key: str, rate_limit: int = 5):
        self.api_key = api_key
        self._rate_limiter = AsyncLimiter(max_rate=rate_limit, time_period=60)

    def _build_client(self):
        return build("youtube", "v3", developerKey=self.api_key)

    async def search_videos(
        self,
        queries: list[str],
        max_results_per_query: int = 3,
        channel_ids: list[str] | None = None,
    ) -> list[VideoResult]:
        logger.debug(
            "YouTube search batch start: queries=%s max_results_per_query=%s",
            queries,
            max_results_per_query,
        )
        seen_ids: set[str] = set()
        results: list[VideoResult] = []

        if channel_ids:
            primary_query = queries[0] if queries else ""
            for channel_id in channel_ids:
                try:
                    async with self._rate_limiter:
                        videos = await self._search_single_query(
                            primary_query,
                            max_results=2,
                            channel_id=channel_id,
                            seeded=True,
                        )
                    for video in videos:
                        if video.video_id not in seen_ids:
                            seen_ids.add(video.video_id)
                            results.append(video)
                except Exception as e:
                    logger.warning(
                        "Channel search failed: channel_id=%s error=%s",
                        channel_id,
                        e,
                    )

        for query in queries:
            try:
                async with self._rate_limiter:
                    videos = await self._search_single_query(
                        query,
                        max_results=max_results_per_query,
                    )
                logger.debug(
                    "YouTube search query result: query=%s results=%s",
                    query,
                    len(videos),
                )
                for video in videos:
                    if video.video_id not in seen_ids:
                        seen_ids.add(video.video_id)
                        results.append(video)
            except Exception as e:
                logger.warning(f"Search failed for query '{query}': {e}")
                continue

        logger.debug("YouTube search batch complete: total_results=%s", len(results))
        return results

    async def _search_single_query(
        self,
        query: str,
        max_results: int,
        channel_id: str | None = None,
        seeded: bool = False,
    ) -> list[VideoResult]:
        try:
            loop = asyncio.get_event_loop()
            youtube = self._build_client()

            # search.list — 100 quota units
            logger.debug(
                "YouTube search.list request: query=%s max_results=%s",
                query,
                max_results,
            )
            search_params = {
                "q": query,
                "part": "snippet",
                "type": "video",
                "maxResults": max_results,
                "order": "relevance",
                "videoDuration": "medium",
                "relevanceLanguage": "en",
            }
            if channel_id:
                search_params["channelId"] = channel_id

            search_response = await loop.run_in_executor(
                None,
                lambda: youtube.search().list(**search_params).execute(),
            )
            logger.debug(
                "YouTube search.list response: query=%s items=%s",
                query,
                len(search_response.get("items", [])),
            )

            video_ids = [
                item["id"]["videoId"]
                for item in search_response.get("items", [])
            ]

            if not video_ids:
                logger.debug("YouTube search.list no results: query=%s", query)
                return []

            # videos.list for stats — 1 quota unit per video
            logger.debug(
                "YouTube videos.list request: query=%s video_ids=%s",
                query,
                video_ids,
            )
            stats_response = await loop.run_in_executor(
                None,
                lambda: youtube.videos()
                .list(
                    part="statistics,contentDetails",
                    id=",".join(video_ids),
                )
                .execute(),
            )
            logger.debug(
                "YouTube videos.list response: query=%s items=%s",
                query,
                len(stats_response.get("items", [])),
            )

            stats_map: dict[str, dict] = {}
            for item in stats_response.get("items", []):
                view_raw = item.get("statistics", {}).get("viewCount")
                like_raw = item.get("statistics", {}).get("likeCount")
                stats_map[item["id"]] = {
                    "view_count": int(view_raw) if view_raw is not None else None,
                    "like_count": int(like_raw) if like_raw is not None else None,
                    "duration": item.get("contentDetails", {}).get("duration"),
                }

            results: list[VideoResult] = []
            for item in search_response.get("items", []):
                vid_id = item["id"]["videoId"]
                snippet = item["snippet"]
                stats = stats_map.get(vid_id, {})

                results.append(
                    VideoResult(
                        video_id=vid_id,
                        title=snippet.get("title", ""),
                        channel_name=snippet.get("channelTitle", ""),
                        thumbnail_url=snippet.get("thumbnails", {})
                        .get("high", {})
                        .get("url"),
                        view_count=stats.get("view_count"),
                        like_count=stats.get("like_count"),
                        duration=stats.get("duration"),
                        url=f"https://www.youtube.com/watch?v={vid_id}",
                        search_query=query,
                        seeded=seeded,
                    )
                )

            logger.debug(
                "YouTube _search_single_query completed: query=%s results=%s",
                query,
                len(results),
            )
            return results
        except Exception as e:
            raise VideoSearchError(f"YouTube search failed: {e}")

    async def resolve_channel_urls(self, channel_urls: list[str]) -> list[str]:
        if not channel_urls:
            return []
        channel_ids: list[str] = []
        seen: set[str] = set()
        for url in channel_urls:
            channel_id = await self._resolve_channel_url(url)
            if channel_id and channel_id not in seen:
                seen.add(channel_id)
                channel_ids.append(channel_id)
        return channel_ids

    async def _resolve_channel_url(self, url: str) -> str | None:
        match = re.search(r"youtube\.com/channel/([\w-]+)", url)
        if match:
            return match.group(1)

        handle_match = re.search(r"youtube\.com/@([\w.-]+)", url)
        if handle_match:
            return await self._resolve_handle(handle_match.group(1))

        user_match = re.search(r"youtube\.com/user/([\w.-]+)", url)
        if user_match:
            return await self._resolve_username(user_match.group(1))

        custom_match = re.search(r"youtube\.com/c/([\w.-]+)", url)
        if custom_match:
            return await self._search_channel_id(custom_match.group(1))

        return None

    async def _resolve_handle(self, handle: str) -> str | None:
        try:
            loop = asyncio.get_event_loop()
            youtube = self._build_client()
            response = await loop.run_in_executor(
                None,
                lambda: youtube.channels()
                .list(part="id", forHandle=handle)
                .execute(),
            )
            items = response.get("items", [])
            return items[0]["id"] if items else None
        except Exception as e:
            logger.warning("Failed to resolve handle: %s error=%s", handle, e)
            return None

    async def _resolve_username(self, username: str) -> str | None:
        try:
            loop = asyncio.get_event_loop()
            youtube = self._build_client()
            response = await loop.run_in_executor(
                None,
                lambda: youtube.channels()
                .list(part="id", forUsername=username)
                .execute(),
            )
            items = response.get("items", [])
            return items[0]["id"] if items else None
        except Exception as e:
            logger.warning("Failed to resolve username: %s error=%s", username, e)
            return None

    async def _search_channel_id(self, query: str) -> str | None:
        try:
            loop = asyncio.get_event_loop()
            youtube = self._build_client()
            response = await loop.run_in_executor(
                None,
                lambda: youtube.search()
                .list(part="snippet", q=query, type="channel", maxResults=1)
                .execute(),
            )
            items = response.get("items", [])
            if not items:
                return None
            return items[0]["snippet"]["channelId"]
        except Exception as e:
            logger.warning("Failed to resolve channel search: %s error=%s", query, e)
            return None
