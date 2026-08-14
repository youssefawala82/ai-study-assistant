"""LLM client. Supports two providers, selected via settings.llm_provider:
- "ollama": local server, used for development (no API key, runs on your machine)
- "gemini": Google's cloud API, used for deployment (needs GEMINI_API_KEY)

Both expose the same chat()/embed() interface so the rest of the app never needs
to know which provider is active.
"""
import httpx

from app.core.config import settings


# ---------------------------------------------------------------------------
# Ollama (local dev)
# ---------------------------------------------------------------------------

def _ollama_chat(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    payload = {
        "model": settings.ollama_chat_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
    }
    if json_mode:
        payload["format"] = "json"

    with httpx.Client(timeout=120) as client:
        response = client.post(f"{settings.ollama_base_url}/api/chat", json=payload)
        response.raise_for_status()
        return response.json()["message"]["content"]


def _ollama_embed(text: str) -> list[float]:
    payload = {"model": settings.ollama_embed_model, "prompt": text}

    with httpx.Client(timeout=60) as client:
        response = client.post(f"{settings.ollama_base_url}/api/embeddings", json=payload)
        response.raise_for_status()
        return response.json()["embedding"]


# ---------------------------------------------------------------------------
# Gemini (deployment)
# ---------------------------------------------------------------------------

_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def _gemini_chat(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    if not settings.gemini_api_key:
        raise RuntimeError("LLM_PROVIDER is 'gemini' but GEMINI_API_KEY is not set")

    url = f"{_GEMINI_BASE_URL}/models/{settings.gemini_chat_model}:generateContent"
    payload: dict = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
    }
    if json_mode:
        payload["generationConfig"] = {"responseMimeType": "application/json"}

    with httpx.Client(timeout=120) as client:
        response = client.post(
            url,
            params={"key": settings.gemini_api_key},
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


def _gemini_embed(text: str) -> list[float]:
    if not settings.gemini_api_key:
        raise RuntimeError("LLM_PROVIDER is 'gemini' but GEMINI_API_KEY is not set")

    url = f"{_GEMINI_BASE_URL}/models/{settings.gemini_embed_model}:embedContent"
    payload = {"content": {"parts": [{"text": text}]}}

    with httpx.Client(timeout=60) as client:
        response = client.post(
            url,
            params={"key": settings.gemini_api_key},
            json=payload,
        )
        response.raise_for_status()
        return response.json()["embedding"]["values"]


# ---------------------------------------------------------------------------
# Public interface — the rest of the app only ever calls these two functions
# ---------------------------------------------------------------------------

def chat(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    if settings.llm_provider == "gemini":
        return _gemini_chat(system_prompt, user_prompt, json_mode)
    return _ollama_chat(system_prompt, user_prompt, json_mode)


def embed(text: str) -> list[float]:
    if settings.llm_provider == "gemini":
        return _gemini_embed(text)
    return _ollama_embed(text)


def embed_batch(texts: list[str]) -> list[list[float]]:
    return [embed(t) for t in texts]