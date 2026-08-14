from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.base import Base  # noqa: F401 — registers all models on Base.metadata
from app.db.session import engine

app = FastAPI(title="AI Study Assistant API", version="0.1.0")


@app.on_event("startup")
def create_tables():
    # Dev convenience: creates any missing tables from the SQLAlchemy models.
    # Replace with Alembic migrations before this goes anywhere near production.
    Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}
