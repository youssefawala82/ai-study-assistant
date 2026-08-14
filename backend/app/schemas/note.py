import uuid

from pydantic import BaseModel


class NoteGenerateRequest(BaseModel):
    document_id: uuid.UUID
    highlighted_text: str | None = None
    note_type: str = "note"
