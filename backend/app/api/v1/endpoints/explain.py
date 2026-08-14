from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.models.user import User
from app.services.llm import chat

router = APIRouter()

SYSTEM_PROMPT = (
    "You explain complicated topics in extremely simple terms, as if to a curious "
    "10-year-old. Use short sentences, everyday words, and a relatable analogy. "
    "Avoid jargon entirely."
)


class ExplainRequest(BaseModel):
    text: str | None = None
    document_id: str | None = None


@router.post("")
def explain_like_im_10(
    payload: ExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source_text = payload.text

    if not source_text and payload.document_id:
        document = db.get(Document, payload.document_id)
        if not document or document.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Document not found")
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index)
            .limit(5)
            .all()
        )
        source_text = "\n\n".join(c.content for c in chunks)

    if not source_text:
        raise HTTPException(status_code=400, detail="Provide either text or document_id")

    explanation = chat(SYSTEM_PROMPT, f"Explain this simply:\n\n{source_text}")
    return {"explanation": explanation}
