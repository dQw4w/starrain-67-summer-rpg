from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from db import get_client

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    qr_test_mode: Optional[bool] = None
    rain_mode: Optional[bool] = None


def read_settings() -> dict:
    row = get_client().table("game_settings").select("*").eq("id", 1).maybe_single().execute()
    data = row.data or {}
    return {
        "qr_test_mode": data.get("qr_test_mode", False),
        "rain_mode":    data.get("rain_mode", False),
    }


@router.get("")
def get_settings():
    return read_settings()


@router.put("")
def update_settings(body: SettingsUpdate):
    updates = body.model_dump(exclude_none=True)
    if updates:
        get_client().table("game_settings").update(updates).eq("id", 1).execute()
    return read_settings()
