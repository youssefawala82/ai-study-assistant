import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.chat import Chat, Message
from app.models.course import Course
from app.models.document import Document
from app.models.flashcard import Flashcard
from app.models.quiz import Quiz, QuizAttempt, QuizQuestion
from app.models.user import User
from app.schemas.course import CourseCreate, CourseRead, CourseUpdate

router = APIRouter()


def _get_owned_course(course_id: uuid.UUID, user: User, db: Session) -> Course:
    course = db.get(Course, course_id)
    if not course or course.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("", response_model=list[CourseRead])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Course)
        .filter(Course.owner_id == current_user.id)
        .order_by(Course.created_at.desc())
        .all()
    )


@router.post("", response_model=CourseRead, status_code=201)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = Course(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        color=payload.color,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseRead)
def get_course(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_course(course_id, current_user, db)


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = _get_owned_course(course_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Imported here (not at module top) to avoid a circular import between
    # courses.py and documents.py, since they both define endpoint routers.
    from app.api.v1.endpoints.documents import delete_document_fully

    course = _get_owned_course(course_id, current_user, db)

    # Documents (+ their files, vectors, chunks, notes)
    documents = db.query(Document).filter(Document.course_id == course.id).all()
    for document in documents:
        delete_document_fully(document, db)

    # Chats (+ their messages)
    chat_ids = [c.id for c in db.query(Chat.id).filter(Chat.course_id == course.id).all()]
    if chat_ids:
        db.query(Message).filter(Message.chat_id.in_(chat_ids)).delete(synchronize_session=False)
        db.query(Chat).filter(Chat.id.in_(chat_ids)).delete(synchronize_session=False)

    # Quizzes (+ their questions and attempts)
    quiz_ids = [q.id for q in db.query(Quiz.id).filter(Quiz.course_id == course.id).all()]
    if quiz_ids:
        db.query(QuizAttempt).filter(QuizAttempt.quiz_id.in_(quiz_ids)).delete(synchronize_session=False)
        db.query(QuizQuestion).filter(QuizQuestion.quiz_id.in_(quiz_ids)).delete(synchronize_session=False)
        db.query(Quiz).filter(Quiz.id.in_(quiz_ids)).delete(synchronize_session=False)

    # Flashcards
    db.query(Flashcard).filter(Flashcard.course_id == course.id).delete(synchronize_session=False)

    db.delete(course)
    db.commit()