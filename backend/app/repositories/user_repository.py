from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_auth0_user_id(self, auth0_user_id: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.auth0_user_id == auth0_user_id)
        )
        return result.scalar_one_or_none()

    async def list_all_with_books(self) -> list[User]:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.books))
            .order_by(User.created_at.asc())
        )
        return list(result.scalars().unique().all())
