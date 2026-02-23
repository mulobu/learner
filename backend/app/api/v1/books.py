from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, status

from app.core.deps import get_book_service, get_current_user, owner_scope_for_user
from app.models.user import User
from app.schemas.book import BookDetailResponse, BookSummaryResponse
from app.schemas.unit import UnitTreeNode
from app.services.book_service import BookService

router = APIRouter(prefix="/books", tags=["books"])


@router.post("/upload", response_model=BookSummaryResponse, status_code=status.HTTP_201_CREATED)
async def upload_book(
    file: UploadFile = File(...),
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(get_current_user),
):
    book = await book_service.upload_book(file, user=current_user)
    return book


@router.get("", response_model=list[BookSummaryResponse])
async def list_books(
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(get_current_user),
):
    return await book_service.list_books(owner_id=owner_scope_for_user(current_user))


@router.get("/{book_id}", response_model=BookDetailResponse)
async def get_book_detail(
    book_id: UUID,
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(get_current_user),
):
    book = await book_service.get_book_detail(
        book_id,
        owner_id=owner_scope_for_user(current_user),
    )

    # Build tree structure from flat units
    units_by_id: dict[UUID, UnitTreeNode] = {}
    root_units: list[UnitTreeNode] = []

    for unit in sorted(book.units, key=lambda u: u.order_index):
        node = UnitTreeNode(
            id=unit.id,
            title=unit.title,
            level=unit.level,
            order_index=unit.order_index,
            start_page=unit.start_page,
            end_page=unit.end_page,
            status=unit.status,
            is_processed=unit.is_processed,
            children=[],
        )
        units_by_id[unit.id] = node

        if unit.parent_id and unit.parent_id in units_by_id:
            units_by_id[unit.parent_id].children.append(node)
        else:
            root_units.append(node)

    return BookDetailResponse(
        id=book.id,
        title=book.title,
        author=book.author,
        filename=book.filename,
        total_pages=book.total_pages,
        toc_extracted=book.toc_extracted,
        units=root_units,
        created_at=book.created_at,
    )


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: UUID,
    book_service: BookService = Depends(get_book_service),
    current_user: User = Depends(get_current_user),
):
    await book_service.delete_book(
        book_id,
        owner_id=owner_scope_for_user(current_user),
    )
