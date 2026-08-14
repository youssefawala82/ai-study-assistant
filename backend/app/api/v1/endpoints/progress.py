from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.chat import Chat, Message
from app.models.document import Document
from app.models.flashcard import Flashcard
from app.models.progress import StudySession
from app.models.quiz import QuizAttempt
from app.models.user import User

router = APIRouter()


def _compute_streak(db: Session, user_id) -> int:
    """Consecutive days (ending today) with at least one study_sessions entry."""
    rows = (
        db.query(func.date(StudySession.occurred_at))
        .filter(StudySession.user_id == user_id)
        .distinct()
        .all()
    )
    study_dates = {r[0] for r in rows}

    streak = 0
    day = datetime.utcnow().date()
    while day in study_dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


@router.get("/summary")
def progress_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents_uploaded = db.query(Document).filter(Document.owner_id == current_user.id).count()

    questions_asked = (
        db.query(Message)
        .join(Chat, Message.chat_id == Chat.id)
        .filter(Message.role == "user", Chat.user_id == current_user.id)
        .count()
    )

    quizzes_completed = (
        db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).count()
    )

    flashcards_reviewed = (
        db.query(Flashcard)
        .filter(Flashcard.user_id == current_user.id, Flashcard.review_count > 0)
        .count()
    )

    total_seconds = (
        db.query(func.coalesce(func.sum(StudySession.duration_seconds), 0))
        .filter(StudySession.user_id == current_user.id)
        .scalar()
    )

    return {
        "documents_uploaded": documents_uploaded,
        "questions_asked": questions_asked,
        "quizzes_completed": quizzes_completed,
        "flashcards_reviewed": flashcards_reviewed,
        "study_streak_days": _compute_streak(db, current_user.id),
        "time_spent_seconds": int(total_seconds or 0),
    }


@router.get("/study-sessions")
def study_sessions(
    range: str = "week",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days = 7 if range == "week" else 30
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            func.date(StudySession.occurred_at).label("day"),
            StudySession.activity_type,
            func.count().label("count"),
        )
        .filter(StudySession.user_id == current_user.id, StudySession.occurred_at >= since)
        .group_by("day", StudySession.activity_type)
        .order_by("day")
        .all()
    )

    return [{"day": str(r.day), "activity_type": r.activity_type, "count": r.count} for r in rows]
