# AI Study Assistant

A platform where students upload study materials and use AI to chat with documents (RAG), generate summaries, quizzes, flashcards, notes, and study plans — powered entirely by local open-source models via Ollama.

## Stack
- **Backend**: FastAPI + SQLAlchemy + Postgres
- **Frontend**: React + TypeScript + Tailwind + React Router
- **Vector DB**: ChromaDB (persisted to disk, runs inside the backend container)
- **LLM + embeddings**: Ollama (runs as its own container, no API key needed)
- **File storage**: local disk by default, or Supabase Storage (set `STORAGE_BACKEND=supabase`)

## First-time setup

```bash
cd ai-study-assistant
cp backend/.env.example backend/.env
docker compose up --build
```

This starts 4 containers: Postgres, Ollama, the FastAPI backend, and the React frontend.

### Pull the Ollama models (one-time, required)

The chat/summarizer/quiz/flashcard features need two models pulled into the Ollama container —
a chat model and an embedding model. In a **new terminal**, while `docker compose up` is running:

```bash
docker exec -it ai-study-assistant-ollama-1 ollama pull llama3.2
docker exec -it ai-study-assistant-ollama-1 ollama pull nomic-embed-text
```

- `llama3.2` is ~2GB and handles chat, summaries, quizzes, flashcards, notes, and study plans.
- `nomic-embed-text` is ~270MB and handles embeddings for the RAG search.

These downloads only need to happen once — they're stored in a Docker volume (`ollama_data`) that
persists across restarts. **On a slow connection this can take a while** — if `llama3.2` is too
large/slow for your machine, a smaller alternative is `llama3.2:1b` (update `OLLAMA_CHAT_MODEL` in
`backend/.env` to match).

Check they're ready:
```bash
docker exec -it ai-study-assistant-ollama-1 ollama list
```

## Using it

- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

Sign up → create a course → upload a PDF/DOCX/PPTX/TXT → it's automatically chunked and embedded →
chat with it, summarize it, generate a quiz or flashcards from it, or build a study plan across
multiple courses.

## Switching file storage to Supabase

By default files are stored on local disk (`backend/uploads/`). To use Supabase Storage instead:

1. Create a bucket in your Supabase project (Storage tab)
2. In `backend/.env`, set:
   ```
   STORAGE_BACKEND=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   SUPABASE_BUCKET=documents
   ```
3. Restart: `docker compose up --build`

## Architecture notes

- Document processing (extract → chunk → embed) currently runs **synchronously** during upload,
  for simplicity. For large files or many concurrent uploads, move `_process_document` in
  `documents.py` to a background task queue (Celery/RQ).
- DB tables are created automatically on backend startup via `Base.metadata.create_all` — fine for
  local dev. Before deploying anywhere real, switch to proper Alembic migrations (already scaffolded
  in `backend/alembic.ini` territory — just needs `alembic init`/`alembic revision` set up).
- Quiz/flashcard/note generation all call the LLM with `format: json` and parse the response — if
  the model returns malformed JSON, the endpoint returns a 502 asking to retry. Larger/newer models
  tend to follow the JSON format instruction more reliably than very small ones.
