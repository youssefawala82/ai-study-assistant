"""Core RAG orchestration: retrieve relevant chunks + call the LLM for an answer."""
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk
from app.services.embeddings import query_similar
from app.services.llm import chat

SYSTEM_PROMPT = (
    "You are a study assistant. Answer the student's question using ONLY the "
    "provided document excerpts. If the excerpts don't contain the answer, say so "
    "clearly instead of guessing. Be concise and clear, like a helpful tutor."
)


def answer_question(
    db: Session,
    question: str,
    document_id: str | None = None,
    course_id: str | None = None,
) -> dict:
    """Returns {"answer": str, "cited_chunk_ids": list[str]}"""
    document_ids = None
    if course_id and not document_id:
        docs = db.query(Document).filter(Document.course_id == course_id).all()
        document_ids = [str(d.id) for d in docs]
        if not document_ids:
            return {
                "answer": "There aren't any documents in this course yet to answer from.",
                "cited_chunk_ids": [],
            }

    matches = query_similar(
        question,
        document_id=str(document_id) if document_id else None,
        document_ids=document_ids,
        top_k=5,
    )

    if not matches:
        return {
            "answer": "I couldn't find anything relevant in the uploaded documents to answer that.",
            "cited_chunk_ids": [],
        }

    context = "\n\n---\n\n".join(m["content"] for m in matches)
    user_prompt = f"Document excerpts:\n\n{context}\n\n---\n\nQuestion: {question}"

    answer = chat(SYSTEM_PROMPT, user_prompt)

    vector_ids = [m["vector_id"] for m in matches]
    chunk_rows = db.query(DocumentChunk).filter(DocumentChunk.vector_id.in_(vector_ids)).all()
    cited_chunk_ids = [str(c.id) for c in chunk_rows]

    return {"answer": answer, "cited_chunk_ids": cited_chunk_ids}
