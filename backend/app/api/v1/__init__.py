from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.books import router as books_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.progress import router as progress_router
from app.api.v1.resources import router as resources_router
from app.api.v1.units import router as units_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(books_router)
router.include_router(units_router)
router.include_router(quizzes_router)
router.include_router(resources_router)
router.include_router(progress_router)
router.include_router(admin_router)
