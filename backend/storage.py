"""Supabase Storage helpers for quest photo uploads.

A single private bucket holds every team's photos under a per-team folder:
    quest-photos/team-{team_id}/q{quest_id}-{timestamp}-{idx}.{ext}

The bucket is created automatically on startup (idempotent) so there is never
a manual setup step in the Supabase dashboard.
"""
from loguru import logger
from db import get_client

BUCKET = "quest-photos"

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "heic", "heif", "gif"}

_MEDIA_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "webp": "image/webp", "gif": "image/gif", "heic": "image/heic", "heif": "image/heif",
}


def media_type_for(name: str) -> str:
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    return _MEDIA_TYPES.get(ext, "application/octet-stream")


def ensure_bucket() -> None:
    """Create the private photo bucket if it doesn't already exist."""
    sb = get_client()
    try:
        buckets = sb.storage.list_buckets()
        ids = {getattr(b, "id", None) or getattr(b, "name", None) for b in buckets}
        if BUCKET in ids:
            logger.info(f"Storage bucket '{BUCKET}' already exists")
            return
    except Exception as e:  # listing failed — fall through and try to create
        logger.warning(f"Could not list storage buckets: {e}")

    try:
        sb.storage.create_bucket(BUCKET, options={"public": False})
        logger.info(f"Created storage bucket '{BUCKET}'")
    except Exception as e:
        # Most likely "already exists" on a race / repeated boot — safe to ignore
        logger.info(f"create_bucket('{BUCKET}'): {e}")
