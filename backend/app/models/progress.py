import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, UUIDMixin


class StudySession(Base, UUIDMixin):
    __tablename__ = "study_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(20), nullable=False)  # chat, quiz, flashcard, reading
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    related_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    occurred_at: Mapped[datetime] = mapped_column()
