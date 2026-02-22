from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.book import Book


class BookRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, book: Book) -> Book:
        self.session.add(book)
        await self.session.flush()
        return book

    async def get_by_id(
        self,
        book_id: UUID,
        owner_id: UUID | None = None,
    ) -> Book | None:
        stmt = select(Book).where(Book.id == book_id)
        if owner_id:
            stmt = stmt.where(Book.owner_id == owner_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_with_units(
        self,
        book_id: UUID,
        owner_id: UUID | None = None,
    ) -> Book | None:
        stmt = (
            select(Book)
            .where(Book.id == book_id)
            .options(selectinload(Book.units))
        )
        if owner_id:
            stmt = stmt.where(Book.owner_id == owner_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_hash(
        self,
        file_hash: str,
        owner_id: UUID | None = None,
    ) -> Book | None:
        stmt = select(Book).where(Book.file_hash == file_hash)
        if owner_id:
            stmt = stmt.where(Book.owner_id == owner_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, owner_id: UUID | None = None) -> list[Book]:
        stmt = select(Book).order_by(Book.created_at.desc())
        if owner_id:
            stmt = stmt.where(Book.owner_id == owner_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete(self, book_id: UUID) -> None:
        await self.session.execute(
            delete(Book).where(Book.id == book_id)
        )
