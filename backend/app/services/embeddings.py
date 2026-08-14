"""Read/write the vector database (ChromaDB) and embed text via Ollama."""
import chromadb

from app.core.config import settings
from app.services.llm import embed as embed_text

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _client


def _get_collection():
    return _get_client().get_or_create_collection(name="document_chunks")


def upsert_chunks(document_id: str, chunk_texts: list[str]) -> list[str]:
    """Embeds each chunk and stores it in Chroma. Returns the vector IDs (one per chunk)."""
    if not chunk_texts:
        return []

    collection = _get_collection()
    vector_ids = [f"{document_id}:{i}" for i in range(len(chunk_texts))]
    embeddings = [embed_text(t) for t in chunk_texts]

    collection.add(
        ids=vector_ids,
        embeddings=embeddings,
        documents=chunk_texts,
        metadatas=[{"document_id": document_id} for _ in chunk_texts],
    )
    return vector_ids


def query_similar(
    query: str,
    document_id: str | None = None,
    document_ids: list[str] | None = None,
    top_k: int = 5,
) -> list[dict]:
    """Returns a list of {"vector_id": ..., "content": ..., "document_id": ...} for the closest chunks."""
    collection = _get_collection()
    query_embedding = embed_text(query)

    where = None
    if document_id:
        where = {"document_id": document_id}
    elif document_ids:
        where = {"document_id": {"$in": document_ids}}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
    )

    matches = []
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    for vector_id, content, metadata in zip(ids, documents, metadatas):
        matches.append(
            {
                "vector_id": vector_id,
                "content": content,
                "document_id": metadata.get("document_id"),
            }
        )
    return matches


def delete_document_chunks(document_id: str) -> None:
    collection = _get_collection()
    collection.delete(where={"document_id": document_id})
