"""Upload validation and storage.

Validation is defence-in-depth: declared content type, extension, magic-byte
signature, and a hard size ceiling enforced while streaming.
"""

from __future__ import annotations

import secrets
from pathlib import Path
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.config import settings

_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

_MAGIC: Tuple[Tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
)


def _sniff(head: bytes) -> Optional[str]:
    for signature, mime in _MAGIC:
        if head.startswith(signature):
            return mime
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


async def save_upload(file: UploadFile) -> Tuple[str, bytes, str]:
    """Validate and persist an uploaded image.

    Returns `(public_url, raw_bytes, mime_type)`. Raw bytes are handed to the
    Gemini service so the file is read exactly once.
    """
    declared = (file.content_type or "").lower().split(";")[0].strip()
    if declared not in settings.allowed_image_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type '{declared or 'unknown'}'. "
                   f"Allowed: {', '.join(settings.allowed_image_types)}",
        )

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 256)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit",
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    sniffed = _sniff(data[:16])
    if sniffed is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File content does not match a supported image format",
        )

    extension = _EXTENSIONS[sniffed]
    filename = f"{secrets.token_hex(12)}{extension}"
    destination: Path = settings.upload_dir / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)

    return f"/static/uploads/{filename}", data, sniffed


def read_stored_image(image_url: Optional[str]) -> Optional[Tuple[bytes, str]]:
    """Re-read a previously stored upload (used by re-analysis)."""
    if not image_url:
        return None
    name = Path(image_url).name
    path = settings.upload_dir / name
    if not path.is_file() or path.parent.resolve() != settings.upload_dir.resolve():
        return None
    mime = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(
        path.suffix.lower(), "image/jpeg"
    )
    return path.read_bytes(), mime
