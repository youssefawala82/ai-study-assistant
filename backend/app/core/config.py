from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60

    database_url: str = "postgresql://postgres:postgres@localhost:5432/study_assistant"

    frontend_origin: str = "http://localhost:5173"

    # Vector DB (ChromaDB, local persistent store)
    chroma_persist_dir: str = "./chroma_data"

    # LLM provider: "ollama" (local, dev default) or "gemini" (cloud, used in deployment)
    llm_provider: str = "ollama"

    # Ollama (local dev)
    ollama_base_url: str = "http://ollama:11434"
    ollama_chat_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"

    # Gemini (deployment)
    gemini_api_key: str | None = None
    gemini_chat_model: str = "gemini-2.0-flash"
    gemini_embed_model: str = "text-embedding-004"

    # Storage backend: "local", "supabase", or "r2"
    storage_backend: str = "local"
    storage_local_dir: str = "./uploads"

    # Supabase Storage (only needed if storage_backend = "supabase")
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_bucket: str = "documents"

    # Cloudflare R2 (only needed if storage_backend = "r2"). R2 is S3-compatible.
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket: str = "documents"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()