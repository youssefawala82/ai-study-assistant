import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.course import Course
from app.models.document import Document, DocumentChunk
from app.models.note import Note
from app.models.user import User
from app.schemas.document import DocumentRead
from app.services.document_processing import chunk_text, extract_text
from app.services.embeddings import delete_document_chunks, upsert_chunks
from app.services.llm import chat
from app.services.storage import delete_file, get_file, save_file

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf": "pdf", ".docx": "docx", ".pptx": "pptx", ".txt": "txt"}

SUMMARY_PROMPTS = {
    "short": "Summarize this document in 2-3 sentences.",
    "medium": "Summarize this document in one clear paragraph (5-8 sentences).",
    "detailed": "Write a detailed, thorough summary of this document, covering all major points and sub-topics.",
    "bullet_points": "Summarize this document as a concise bulleted list of the key points.",
    "key_concepts": "List and briefly explain the key concepts and terms introduced in this document.",
}


def _get_owned_course(course_id: uuid.UUID, user: User, db: Session) -> Course:
    course = db.get(Course, course_id)
    if not course or course.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_owned_document(document_id: uuid.UUID, user: User, db: Session) -> Document:
    document = db.get(Document, document_id)
    if not document or document.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def delete_document_fully(document: Document, db: Session) -> None:
    """Removes a document and everything that references it: its file on disk/cloud
    storage, its vectors in Chroma, its chunk rows, and any notes generated from it.
    Does NOT commit — caller decides when to commit (so callers can batch multiple deletes)."""
    delete_file(document.storage_path)
    delete_document_chunks(str(document.id))
    db.query(Note).filter(Note.document_id == document.id).delete()
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    db.delete(document)


def _process_document(document: Document, db: Session):
    """Extract text, chunk it, embed it, and store chunks in Postgres + Chroma."""
    try:
        text = extract_text(document.storage_path, document.file_type)
        pieces = chunk_text(text)

        if not pieces:
            document.status = "failed"
            db.add(document)
            db.commit()
            return

        vector_ids = upsert_chunks(str(document.id), pieces)

        for i, (piece, vector_id) in enumerate(zip(pieces, vector_ids)):
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=i,
                    content=piece,
                    vector_id=vector_id,
                    token_count=len(piece.split()),
                )
            )

        document.status = "ready"
        db.add(document)
        db.commit()
    except Exception:
        document.status = "failed"
        db.add(document)
        db.commit()
        raise


@router.post("/courses/{course_id}/documents", response_model=DocumentRead, status_code=201)
async def upload_document(
    course_id: uuid.UUID,
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_course(course_id, current_user, db)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    file_bytes = await file.read()
    storage_path = save_file(file_bytes, file.filename)

    document = Document(
        course_id=course_id,
        owner_id=current_user.id,
        filename=file.filename,
        file_type=ALLOWED_EXTENSIONS[ext],
        storage_path=storage_path,
        file_size_bytes=len(file_bytes),
        status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Synchronous for simplicity — for larger files, move this to a background
    # task queue (e.g. Celery/RQ) so the upload response doesn't block on it.
    try:
        _process_document(document, db)
    except Exception:
        pass  # status is already set to "failed" inside _process_document

    db.refresh(document)
    return document


@router.get("/courses/{course_id}/documents", response_model=list[DocumentRead])
def list_documents(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_course(course_id, current_user, db)
    return (
        db.query(Document)
        .filter(Document.course_id == course_id, Document.owner_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )


@router.get("/documents/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_document(document_id, current_user, db)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_owned_document(document_id, current_user, db)
    delete_document_fully(document, db)
    db.commit()


@router.get("/documents/{document_id}/status")
def document_status(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_owned_document(document_id, current_user, db)
    return {"status": document.status}


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_owned_document(document_id, current_user, db)

    # Cloud-backed storage (Supabase or R2) — fetch bytes and stream them back
    if document.storage_path.startswith("supabase://") or document.storage_path.startswith("r2://"):
        content = get_file(document.storage_path)
        return Response(content=content, media_type="application/octet-stream")

    # Local disk
    if not os.path.exists(document.storage_path):
        raise HTTPException(status_code=404, detail="File missing from storage")
    return FileResponse(document.storage_path, filename=document.filename)


@router.post("/documents/{document_id}/summarize")
def summarize_document(
    document_id: uuid.UUID,
    summary_type: str = "short",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = _get_owned_document(document_id, current_user, db)

    if summary_type not in SUMMARY_PROMPTS:
        raise HTTPException(status_code=400, detail=f"summary_type must be one of {list(SUMMARY_PROMPTS)}")

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )
    if not chunks:
        raise HTTPException(status_code=400, detail="This document hasn't finished processing yet")

    full_text = "\n\n".join(c.content for c in chunks)
    system_prompt = "You are a study assistant that writes clear, accurate summaries of study materials."
    result = chat(system_prompt, f"{SUMMARY_PROMPTS[summary_type]}\n\nDocument:\n\n{full_text}")

    return {"summary_type": summary_type, "summary": result}