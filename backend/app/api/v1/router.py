from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    chats,
    courses,
    documents,
    explain,
    flashcards,
    notes,
    progress,
    quizzes,
    study_plans,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(documents.router, prefix="", tags=["documents"])  # paths already include /courses and /documents
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["quizzes"])
api_router.include_router(flashcards.router, prefix="/flashcards", tags=["flashcards"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(explain.router, prefix="/explain", tags=["explain"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(study_plans.router, prefix="/study-plans", tags=["study-plans"])
