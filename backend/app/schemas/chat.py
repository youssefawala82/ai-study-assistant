import uuid
from datetime import datetime

from pydantic import BaseModel


class ChatCreate(BaseModel):
    course_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None


class ChatRead(BaseModel):
    id: uuid.UUID
    title: str | None = None
    course_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str


class MessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
