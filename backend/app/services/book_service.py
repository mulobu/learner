from __future__ import annotations

import logging
import os
import uuid

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import (
    BookLimitReachedError,
    BookNotFoundError,
    DuplicateBookError,
    InvalidFileError,
)
from app.models.book import Book
from app.models.unit import Unit
from app.models.user import User, UserRole
from app.repositories.book_repository import BookRepository
from app.repositories.unit_repository import UnitRepository
from app.utils.pdf_service import PDFService, TOCEntry

TYPE_CHECKING = False
if TYPE_CHECKING:
    from app.utils.r2_service import R2Service

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"application/pdf"}


class BookService:
    def __init__(
        self,
        book_repo: BookRepository,
        unit_repo: UnitRepository,
        pdf_service: PDFService,
        r2_service: R2Service | None = None,
        storage_mode: str = "local",
    ):
        self.book_repo = book_repo
        self.unit_repo = unit_repo
        self.pdf_service = pdf_service
        self.r2_service = r2_service
        self.storage_mode = storage_mode

    async def upload_book(self, file: UploadFile, user: User) -> Book:
        owner_id = user.id

        # Standard users get exactly 1 book, ever. Admin/super-user is unlimited.
        if user.role != UserRole.ADMIN and user.has_used_book_slot:
            raise BookLimitReachedError()

        # Validate file type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise InvalidFileError(
                f"Invalid file type: {file.content_type}. Only PDF files are accepted."
            )

        # Read file content
        content = await file.read()

        # Validate file size
        if len(content) > settings.max_file_size_bytes:
            raise InvalidFileError(
                f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB."
            )

        # Compute hash for deduplication
        file_hash = self.pdf_service.compute_hash(content)
        existing = await self.book_repo.get_by_hash(file_hash, owner_id=owner_id)
        if existing:
            raise DuplicateBookError(file.filename or "unknown")

        # Save file
        file_id = str(uuid.uuid4())
        file_key = f"{file_id}.pdf"
        filename = file.filename or "unknown.pdf"

        if self.storage_mode == "r2":
            await self.r2_service.upload_file(file_key, content)
            stored_path = file_key
        else:
            file_path = os.path.join(settings.UPLOAD_DIR, file_key)
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(content)
            stored_path = file_path

        # Extract metadata from bytes (works for both storage modes)
        metadata = self.pdf_service.extract_metadata_from_bytes(content, filename)

        # Create book record
        book = Book(
            owner_id=owner_id,
            title=metadata.title,
            author=metadata.author,
            filename=filename,
            file_path=stored_path,
            file_hash=file_hash,
            total_pages=metadata.total_pages,
            toc_extracted=False,
        )
        book = await self.book_repo.create(book)

        # Extract ToC and build unit hierarchy
        toc_entries = self.pdf_service.extract_toc_from_bytes(content, filename)
        await self._create_units_from_toc(book.id, toc_entries)
        book.toc_extracted = True

        # Track one-time book slot only for non-admin users.
        if user.role != UserRole.ADMIN:
            user.has_used_book_slot = True

        return book

    async def _create_units_from_toc(
        self,
        book_id: uuid.UUID,
        toc_entries: list[TOCEntry],
        parent_id: uuid.UUID | None = None,
        counter: list[int] | None = None,
    ) -> None:
        if counter is None:
            counter = [0]

        for entry in toc_entries:
            unit = Unit(
                book_id=book_id,
                parent_id=parent_id,
                title=entry.title,
                level=entry.level,
                order_index=counter[0],
                start_page=entry.start_page,
                end_page=entry.end_page,
            )
            counter[0] += 1
            unit = await self.unit_repo.create(unit)

            if entry.children:
                await self._create_units_from_toc(
                    book_id, entry.children, unit.id, counter
                )

    async def get_book_detail(
        self,
        book_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ) -> Book:
        book = await self.book_repo.get_by_id_with_units(book_id, owner_id=owner_id)
        if not book:
            raise BookNotFoundError(book_id)
        return book

    async def list_books(self, owner_id: uuid.UUID | None = None) -> list[Book]:
        return await self.book_repo.list_all(owner_id=owner_id)

    async def delete_book(
        self,
        book_id: uuid.UUID,
        owner_id: uuid.UUID | None = None,
    ) -> None:
        book = await self.book_repo.get_by_id(book_id, owner_id=owner_id)
        if not book:
            raise BookNotFoundError(book_id)

        # Delete file from storage
        if self.storage_mode == "r2":
            try:
                await self.r2_service.delete_file(book.file_path)
            except Exception as e:
                logger.warning("Failed to delete from R2: %s", e)
        else:
            if os.path.exists(book.file_path):
                os.remove(book.file_path)

        await self.book_repo.delete(book_id)
