# Import all models here so Base.metadata is aware of them (used by Alembic + create_all)
from app.db.base_class import Base  # noqa
from app.models.user import User  # noqa
from app.models.course import Course  # noqa
from app.models.document import Document, DocumentChunk  # noqa
from app.models.chat import Chat, Message  # noqa
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt  # noqa
from app.models.flashcard import Flashcard  # noqa
from app.models.note import Note  # noqa
from app.models.study_plan import StudyPlan  # noqa
from app.models.progress import StudySession  # noqa
