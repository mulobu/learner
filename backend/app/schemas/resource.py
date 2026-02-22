from uuid import UUID

from pydantic import BaseModel


class VideoResourceResponse(BaseModel):
    id: UUID
    source: str
    search_query: str
    video_id: str
    title: str
    channel_name: str
    thumbnail_url: str | None
    view_count: int | None
    like_count: int | None
    duration: str | None
    relevance_score: float | None
    url: str

    model_config = {"from_attributes": True}
