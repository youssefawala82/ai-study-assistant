import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    filename: str
    file_type: str
    status: str
    file_size_bytes: int | None = None
    page_count: int | None = None
    uploaded_at: datetime = Field(alias="created_at")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
