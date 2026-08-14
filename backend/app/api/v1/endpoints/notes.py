import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteGenerateRequest
from app.services.llm import chat

router = APIRouter()

NOTE_PROMPTS = {
    "note": "Turn this excerpt into clear, well-organized study notes.",
    "definition": "Extract and clearly define the key term(s) in this excerpt.",
    "formula": "Extract any formulas in this excerpt and explain each variable and when to use it.",
    "study_guide": "Turn this excerpt into a structured study guide with headings and key takeaways.",
}


@router.post("/generate", status_code=201)
def generate_note(
    payload: NoteGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.get(Document, payload.document_id)
    if not document or document.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    if payload.note_type not in NOTE_PROMPTS:
        raise HTTPException(status_code=400, detail=f"note_type must be one of {list(NOTE_PROMPTS)}")

    source = payload.highlighted_text or document.filename
    system_prompt = "You are a study assistant that turns excerpts into clear, useful study notes."
    generated = chat(system_prompt, f"{NOTE_PROMPTS[payload.note_type]}\n\nExcerpt:\n\n{source}")

    note = Note(
        document_id=payload.document_id,
        user_id=current_user.id,
        highlighted_text=payload.highlighted_text,
        generated_content=generated,
        note_type=payload.note_type,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": str(note.id),
        "note_type": note.note_type,
        "generated_content": note.generated_content,
    }


@router.get("")
def list_notes(
    document_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if document_id:
        query = query.filter(Note.document_id == document_id)

    notes = query.order_by(Note.created_at.desc()).all()
    return [
        {
            "id": str(n.id),
            "note_type": n.note_type,
            "highlighted_text": n.highlighted_text,
            "generated_content": n.generated_content,
            "created_at": n.created_at,
        }
        for n in notes
    ]


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.get(Note, note_id)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
