import uuid

from pydantic import BaseModel


class FlashcardGenerateRequest(BaseModel):
    document_id: uuid.UUID | None = None
    course_id: uuid.UUID | None = None
    num_cards: int = 20


class FlashcardStatusUpdate(BaseModel):
    status: str  # learned, review_later, difficult, new
