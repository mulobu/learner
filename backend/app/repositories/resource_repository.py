from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.models.unit import Unit
from app.models.video_resource import VideoResource


class ResourceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def bulk_create(
        self, resources: list[VideoResource]
    ) -> list[VideoResource]:
        self.session.add_all(resources)
        await self.session.flush()
        return resources

    async def get_by_unit(
        self,
        unit_id: UUID,
        owner_id: UUID | None = None,
    ) -> list[VideoResource]:
        stmt = (
            select(VideoResource)
            .where(VideoResource.unit_id == unit_id)
            .order_by(VideoResource.relevance_score.desc().nulls_last())
        )
        if owner_id:
            stmt = (
                stmt.join(Unit, Unit.id == VideoResource.unit_id)
                .join(Book, Book.id == Unit.book_id)
                .where(Book.owner_id == owner_id)
            )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def has_resources(self, unit_id: UUID) -> bool:
        result = await self.session.execute(
            select(VideoResource.id)
            .where(VideoResource.unit_id == unit_id)
            .limit(1)
        )
        return result.scalar_one_or_none() is not None
