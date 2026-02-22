from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.book import Book
from app.models.unit import Unit


class UnitRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, unit: Unit) -> Unit:
        self.session.add(unit)
        await self.session.flush()
        return unit

    async def bulk_create(self, units: list[Unit]) -> list[Unit]:
        self.session.add_all(units)
        await self.session.flush()
        return units

    async def get_by_id(
        self,
        unit_id: UUID,
        owner_id: UUID | None = None,
    ) -> Unit | None:
        stmt = select(Unit).where(Unit.id == unit_id)
        if owner_id:
            stmt = stmt.join(Book, Book.id == Unit.book_id).where(
                Book.owner_id == owner_id
            )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_with_relations(
        self,
        unit_id: UUID,
        owner_id: UUID | None = None,
    ) -> Unit | None:
        stmt = (
            select(Unit)
            .where(Unit.id == unit_id)
            .options(
                selectinload(Unit.quiz_questions),
                selectinload(Unit.video_resources),
                selectinload(Unit.quiz_attempts),
                selectinload(Unit.children),
            )
        )
        if owner_id:
            stmt = stmt.join(Book, Book.id == Unit.book_id).where(
                Book.owner_id == owner_id
            )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_tree_by_book(self, book_id: UUID) -> list[Unit]:
        result = await self.session.execute(
            select(Unit)
            .where(Unit.book_id == book_id)
            .options(selectinload(Unit.children))
            .order_by(Unit.order_index)
        )
        return list(result.scalars().unique().all())

    async def get_root_units_by_book(self, book_id: UUID) -> list[Unit]:
        result = await self.session.execute(
            select(Unit)
            .where(Unit.book_id == book_id, Unit.parent_id.is_(None))
            .options(selectinload(Unit.children).selectinload(Unit.children))
            .order_by(Unit.order_index)
        )
        return list(result.scalars().unique().all())

    async def update_status(self, unit_id: UUID, status: str) -> Unit | None:
        unit = await self.get_by_id(unit_id)
        if unit:
            unit.status = status
            await self.session.flush()
        return unit

    async def mark_processed(self, unit_id: UUID) -> Unit | None:
        unit = await self.get_by_id(unit_id)
        if unit:
            unit.is_processed = True
            from datetime import datetime, timezone
            unit.processed_at = datetime.now(timezone.utc)
            await self.session.flush()
        return unit

    async def get_progress_stats(self, book_id: UUID) -> dict:
        total_result = await self.session.execute(
            select(func.count()).where(Unit.book_id == book_id)
        )
        total = total_result.scalar() or 0

        completed_result = await self.session.execute(
            select(func.count()).where(
                Unit.book_id == book_id, Unit.status == "completed"
            )
        )
        completed = completed_result.scalar() or 0

        in_progress_result = await self.session.execute(
            select(func.count()).where(
                Unit.book_id == book_id, Unit.status == "in_progress"
            )
        )
        in_progress = in_progress_result.scalar() or 0

        return {
            "total_units": total,
            "completed_units": completed,
            "in_progress_units": in_progress,
            "not_started_units": total - completed - in_progress,
        }

    async def get_siblings(self, unit: Unit) -> list[Unit]:
        result = await self.session.execute(
            select(Unit)
            .where(
                Unit.book_id == unit.book_id,
                Unit.parent_id == unit.parent_id,
            )
            .order_by(Unit.order_index)
        )
        return list(result.scalars().all())
