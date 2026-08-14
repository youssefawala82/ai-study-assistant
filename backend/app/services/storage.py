"""File storage abstraction. Three backends, chosen via settings.storage_backend:
- "local": writes to disk under settings.storage_local_dir (default, for dev)
- "supabase": uploads to a Supabase Storage bucket via its REST API
- "r2": uploads to a Cloudflare R2 bucket (S3-compatible, via boto3)
"""
import os
import uuid

import httpx

from app.core.config import settings


def _ensure_local_dir():
    os.makedirs(settings.storage_local_dir, exist_ok=True)


def _unique_name(filename: str) -> str:
    ext = os.path.splitext(filename)[1]
    return f"{uuid.uuid4().hex}{ext}"


# ---------------------------------------------------------------------------
# Cloudflare R2 (S3-compatible)
# ---------------------------------------------------------------------------

def _r2_client():
    import boto3

    if not (settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key):
        raise RuntimeError(
            "storage_backend is 'r2' but R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY are not set"
        )

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def save_file(file_bytes: bytes, filename: str) -> str:
    """Returns a storage_path that get_file()/delete_file() can use later:
    - local file path for "local"
    - "supabase://<key>" for Supabase
    - "r2://<key>" for R2
    """
    unique_name = _unique_name(filename)

    if settings.storage_backend == "r2":
        client = _r2_client()
        client.put_object(Bucket=settings.r2_bucket, Key=unique_name, Body=file_bytes)
        return f"r2://{unique_name}"

    if settings.storage_backend == "supabase":
        if not settings.supabase_url or not settings.supabase_service_key:
            raise RuntimeError("Supabase storage is selected but SUPABASE_URL/SUPABASE_SERVICE_KEY are not set")

        url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{unique_name}"
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "apikey": settings.supabase_service_key,
            "Content-Type": "application/octet-stream",
        }
        response = httpx.post(url, headers=headers, content=file_bytes, timeout=60)
        response.raise_for_status()
        return f"supabase://{unique_name}"

    # local
    _ensure_local_dir()
    storage_path = os.path.join(settings.storage_local_dir, unique_name)
    with open(storage_path, "wb") as f:
        f.write(file_bytes)
    return storage_path


def get_file(storage_path: str) -> bytes:
    if storage_path.startswith("r2://"):
        key = storage_path.removeprefix("r2://")
        client = _r2_client()
        obj = client.get_object(Bucket=settings.r2_bucket, Key=key)
        return obj["Body"].read()

    if storage_path.startswith("supabase://"):
        key = storage_path.removeprefix("supabase://")
        url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{key}"
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "apikey": settings.supabase_service_key,
        }
        response = httpx.get(url, headers=headers, timeout=60)
        response.raise_for_status()
        return response.content

    with open(storage_path, "rb") as f:
        return f.read()


def delete_file(storage_path: str) -> None:
    if storage_path.startswith("r2://"):
        key = storage_path.removeprefix("r2://")
        client = _r2_client()
        client.delete_object(Bucket=settings.r2_bucket, Key=key)
        return

    if storage_path.startswith("supabase://"):
        key = storage_path.removeprefix("supabase://")
        url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_bucket}/{key}"
        headers = {
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "apikey": settings.supabase_service_key,
        }
        httpx.delete(url, headers=headers, timeout=30)
        return

    if os.path.exists(storage_path):
        os.remove(storage_path)