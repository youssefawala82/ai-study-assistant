import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.models.flashcard import Flashcard
from app.models.progress import StudySession
from app.models.user import User
from app.schemas.flashcard import FlashcardGenerateRequest, FlashcardStatusUpdate
from app.services.llm import chat

router = APIRouter()

FLASHCARD_SYSTEM_PROMPT = """You are a study assistant that writes flashcards from study material.
Respond with ONLY a JSON object (no markdown, no commentary) in this exact shape:
{"cards": [{"front": "question or term", "back": "answer or definition"}]}
Keep each side concise — a sentence or two at most.
"""


def _gather_source_text(payload: FlashcardGenerateRequest, user: User, db: Session) -> str:
    query = db.query(DocumentChunk).join(Document, DocumentChunk.document_id == Document.id)
    query = query.filter(Document.owner_id == user.id)

    if payload.document_id:
        query = query.filter(Document.id == payload.document_id)
    elif payload.course_id:
        query = query.filter(Document.course_id == payload.course_id)
    else:
        raise HTTPException(status_code=400, detail="Provide either document_id or course_id")

    chunks = query.order_by(DocumentChunk.chunk_index).all()
    if not chunks:
        raise HTTPException(status_code=400, detail="No processed document content found to generate flashcards from")

    return "\n\n".join(c.content for c in chunks)


@router.post("/generate", status_code=201)
def generate_flashcards(
    payload: FlashcardGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source_text = _gather_source_text(payload, current_user, db)

    user_prompt = f"Generate {payload.num_cards} flashcards from this study material:\n\n{source_text}"
    raw = chat(FLASHCARD_SYSTEM_PROMPT, user_prompt, json_mode=True)

    try:
        parsed = json.loads(raw)
        cards = parsed["cards"]
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="The model returned an unexpected format. Try again.")

    # Small local models don't reliably follow "generate exactly N" — enforce it here
    # instead of trusting the model's count.
    cards = cards[: payload.num_cards]

    # Replace any existing flashcards for this exact scope (course or document) rather
    # than piling new ones on top — otherwise repeated generations accumulate endlessly.
    existing_query = db.query(Flashcard).filter(Flashcard.user_id == current_user.id)
    if payload.document_id:
        existing_query = existing_query.filter(Flashcard.document_id == payload.document_id)
    elif payload.course_id:
        existing_query = existing_query.filter(
            Flashcard.course_id == payload.course_id, Flashcard.document_id.is_(None)
        )
    existing_query.delete(synchronize_session=False)

    created = []
    for card in cards:
        flashcard = Flashcard(
            document_id=payload.document_id,
            course_id=payload.course_id,
            user_id=current_user.id,
            front=card.get("front", ""),
            back=card.get("back", ""),
        )
        db.add(flashcard)
        created.append(flashcard)
    db.commit()

    return {"created": len(created)}


@router.get("")
def list_flashcards(
    course_id: uuid.UUID | None = None,
    document_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Flashcard).filter(Flashcard.user_id == current_user.id)
    if course_id:
        query = query.filter(Flashcard.course_id == course_id)
    if document_id:
        query = query.filter(Flashcard.document_id == document_id)
    if status_filter:
        query = query.filter(Flashcard.status == status_filter)

    cards = query.order_by(Flashcard.created_at.desc()).all()
    return [
        {
            "id": str(c.id),
            "front": c.front,
            "back": c.back,
            "status": c.status,
            "review_count": c.review_count,
        }
        for c in cards
    ]


@router.patch("/{flashcard_id}")
def update_flashcard(
    flashcard_id: uuid.UUID,
    payload: FlashcardStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.get(Flashcard, flashcard_id)
    if not card or card.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    card.status = payload.status
    card.review_count += 1
    db.add(card)
    db.add(
        StudySession(
            user_id=current_user.id,
            activity_type="flashcard",
            duration_seconds=0,
            related_id=card.id,
            occurred_at=datetime.utcnow(),
        )
    )
    db.commit()
    return {"id": str(card.id), "status": card.status, "review_count": card.review_count}


@router.delete("/{flashcard_id}", status_code=204)
def delete_flashcard(
    flashcard_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.get(Flashcard, flashcard_id)
    if not card or card.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    db.delete(card)
    db.commit()