import uuid
from datetime import datetime

from pydantic import BaseModel


class CourseBase(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class CourseRead(CourseBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
