import uuid
from datetime import date

from sqlalchemy import JSON, ForeignKey, Numeric
from sqlalchemy import Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class StudyPlan(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "study_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    subjects: Mapped[dict] = mapped_column(JSON, nullable=False)
    available_hours_per_day: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    generated_schedule: Mapped[dict | None] = mapped_column(JSON)
