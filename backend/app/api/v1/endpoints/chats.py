import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.chat import Chat, Message
from app.models.progress import StudySession
from app.models.user import User
from app.schemas.chat import ChatCreate, ChatRead, MessageCreate, MessageRead
from app.services.rag import answer_question

router = APIRouter()


def _get_owned_chat(chat_id: uuid.UUID, user: User, db: Session) -> Chat:
    chat_obj = db.get(Chat, chat_id)
    if not chat_obj or chat_obj.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat_obj


@router.post("", response_model=ChatRead, status_code=201)
def create_chat(
    payload: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat_obj = Chat(
        user_id=current_user.id,
        course_id=payload.course_id,
        document_id=payload.document_id,
    )
    db.add(chat_obj)
    db.commit()
    db.refresh(chat_obj)
    return chat_obj


@router.get("", response_model=list[ChatRead])
def list_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Chat)
        .filter(Chat.user_id == current_user.id)
        .order_by(Chat.created_at.desc())
        .all()
    )


@router.get("/{chat_id}", response_model=ChatRead)
def get_chat(
    chat_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_chat(chat_id, current_user, db)


@router.delete("/{chat_id}", status_code=204)
def delete_chat(
    chat_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat_obj = _get_owned_chat(chat_id, current_user, db)
    db.delete(chat_obj)
    db.commit()


@router.post("/{chat_id}/messages", response_model=MessageRead, status_code=201)
def send_message(
    chat_id: uuid.UUID,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat_obj = _get_owned_chat(chat_id, current_user, db)

    user_message = Message(chat_id=chat_obj.id, role="user", content=payload.content)
    db.add(user_message)
    db.commit()

    if not chat_obj.title:
        chat_obj.title = payload.content[:80]
        db.add(chat_obj)
        db.commit()

    result = answer_question(
        db,
        question=payload.content,
        document_id=str(chat_obj.document_id) if chat_obj.document_id else None,
        course_id=str(chat_obj.course_id) if chat_obj.course_id else None,
    )

    assistant_message = Message(
        chat_id=chat_obj.id,
        role="assistant",
        content=result["answer"],
        cited_chunk_ids=[uuid.UUID(cid) for cid in result["cited_chunk_ids"]] or None,
    )
    db.add(assistant_message)
    db.add(
        StudySession(
            user_id=current_user.id,
            activity_type="chat",
            duration_seconds=0,
            related_id=chat_obj.id,
            occurred_at=datetime.utcnow(),
        )
    )
    db.commit()
    db.refresh(assistant_message)
    return assistant_message


@router.get("/{chat_id}/messages", response_model=list[MessageRead])
def list_messages(
    chat_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat_obj = _get_owned_chat(chat_id, current_user, db)
    return (
        db.query(Message)
        .filter(Message.chat_id == chat_obj.id)
        .order_by(Message.created_at)
        .all()
    )
