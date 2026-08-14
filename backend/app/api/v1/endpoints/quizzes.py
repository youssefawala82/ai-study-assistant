import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.models.progress import StudySession
from app.models.quiz import Quiz, QuizAttempt, QuizQuestion
from app.models.user import User
from app.schemas.quiz import QuizAttemptSubmit, QuizGenerateRequest
from app.services.llm import chat

router = APIRouter()

QUIZ_SYSTEM_PROMPT = """You are a study assistant that writes quiz questions from study material.
Respond with ONLY a JSON object (no markdown, no commentary) in this exact shape:
{
  "questions": [
    {
      "question_type": "mcq" | "true_false" | "fill_blank" | "short_answer",
      "question_text": "...",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."} or null,
      "correct_answer": "...",
      "explanation": "..."
    }
  ]
}
For "mcq", options must be present and correct_answer must be one of the option keys (e.g. "B").
For "true_false", options should be null and correct_answer must be "True" or "False".
For "fill_blank" and "short_answer", options should be null.
"""


def _get_owned_quiz(quiz_id: uuid.UUID, user: User, db: Session) -> Quiz:
    quiz = db.get(Quiz, quiz_id)
    if not quiz or quiz.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


def _gather_source_text(payload: QuizGenerateRequest, user: User, db: Session) -> str:
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
        raise HTTPException(status_code=400, detail="No processed document content found to generate a quiz from")

    return "\n\n".join(c.content for c in chunks)


@router.post("/generate", status_code=201)
def generate_quiz(
    payload: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source_text = _gather_source_text(payload, current_user, db)

    user_prompt = (
        f"Generate {payload.num_questions} questions at {payload.difficulty} difficulty, "
        f"using only these question types: {', '.join(payload.question_types)}.\n\n"
        f"Study material:\n\n{source_text}"
    )

    raw = chat(QUIZ_SYSTEM_PROMPT, user_prompt, json_mode=True)

    try:
        parsed = json.loads(raw)
        questions = parsed["questions"]
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="The model returned an unexpected format. Try again.")

    # Small local models don't reliably follow "generate exactly N" — enforce it here
    # instead of trusting the model's count.
    questions = questions[: payload.num_questions]

    quiz = Quiz(
        document_id=payload.document_id,
        course_id=payload.course_id,
        user_id=current_user.id,
        title=f"Quiz — {payload.difficulty} ({len(questions)} questions)",
        difficulty=payload.difficulty,
        timer_seconds=payload.timer_seconds,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    for i, q in enumerate(questions):
        db.add(
            QuizQuestion(
                quiz_id=quiz.id,
                question_type=q.get("question_type", "short_answer"),
                question_text=q.get("question_text", ""),
                options=q.get("options"),
                correct_answer=str(q.get("correct_answer", "")),
                explanation=q.get("explanation"),
                order_index=i,
            )
        )
    db.commit()

    return {"quiz_id": str(quiz.id), "num_questions": len(questions)}


@router.get("")
def list_quizzes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quizzes = db.query(Quiz).filter(Quiz.user_id == current_user.id).order_by(Quiz.created_at.desc()).all()
    return [
        {"id": str(q.id), "title": q.title, "difficulty": q.difficulty, "created_at": q.created_at}
        for q in quizzes
    ]


@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _get_owned_quiz(quiz_id, current_user, db)
    questions = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.order_index)
        .all()
    )
    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "difficulty": quiz.difficulty,
        "timer_seconds": quiz.timer_seconds,
        "questions": [
            {
                "id": str(q.id),
                "question_type": q.question_type,
                "question_text": q.question_text,
                "options": q.options,
                # correct_answer/explanation withheld until the quiz is submitted
            }
            for q in questions
        ],
    }


@router.delete("/{quiz_id}", status_code=204)
def delete_quiz(
    quiz_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _get_owned_quiz(quiz_id, current_user, db)
    db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).delete(synchronize_session=False)
    db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).delete(synchronize_session=False)
    db.delete(quiz)
    db.commit()


@router.post("/{quiz_id}/attempts", status_code=201)
def submit_attempt(
    quiz_id: uuid.UUID,
    payload: QuizAttemptSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _get_owned_quiz(quiz_id, current_user, db)
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()

    correct_count = 0
    graded = []
    for q in questions:
        submitted = payload.answers.get(str(q.id), "")
        is_correct = submitted.strip().lower() == q.correct_answer.strip().lower()
        if is_correct:
            correct_count += 1
        graded.append(
            {
                "question_id": str(q.id),
                "submitted_answer": submitted,
                "correct_answer": q.correct_answer,
                "is_correct": is_correct,
                "explanation": q.explanation,
            }
        )

    score = round((correct_count / len(questions)) * 100, 2) if questions else 0.0

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        score=score,
        answers=payload.answers,
    )
    db.add(attempt)
    db.add(
        StudySession(
            user_id=current_user.id,
            activity_type="quiz",
            duration_seconds=0,
            related_id=quiz.id,
            occurred_at=datetime.utcnow(),
        )
    )
    db.commit()
    db.refresh(attempt)

    return {"attempt_id": str(attempt.id), "score": score, "results": graded}


@router.get("/{quiz_id}/attempts/{attempt_id}")
def get_attempt(
    quiz_id: uuid.UUID,
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempt = db.get(QuizAttempt, attempt_id)
    if not attempt or attempt.user_id != current_user.id or attempt.quiz_id != quiz_id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return {"attempt_id": str(attempt.id), "score": attempt.score, "answers": attempt.answers}