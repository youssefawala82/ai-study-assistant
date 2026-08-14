import uuid

from pydantic import BaseModel


class QuizGenerateRequest(BaseModel):
    document_id: uuid.UUID | None = None
    course_id: uuid.UUID | None = None
    question_types: list[str] = ["mcq"]
    num_questions: int = 10
    difficulty: str = "medium"
    timer_seconds: int | None = None


class QuizAttemptSubmit(BaseModel):
    answers: dict[str, str]
