from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from db import get_client
from models import AdminTeamUpdate, AdminQuestOverride, AdminBossOverride
from routers.team import _fetch_state
from content import BOSSES, QUESTS, TEAMS

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/teams")
def list_teams():
    db = get_client()
    rows = db.table("teams").select("id, difficulty").order("id").execute().data
    diff_map = {r["id"]: r["difficulty"] for r in rows}
    return [
        {"id": tid, "name": name, "difficulty": diff_map.get(tid, "normal")}
        for tid, name in sorted(TEAMS.items())
    ]


@router.get("/teams/{team_id}")
def get_team(team_id: int):
    return _fetch_state(team_id)


@router.patch("/teams/{team_id}")
def update_team(team_id: int, body: AdminTeamUpdate):
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    updates = body.model_dump(exclude_none=True)
    updates.pop("name", None)  # name is hardcoded
    if not updates:
        return {"ok": True}
    if "difficulty" in updates and updates["difficulty"] not in ("easy", "normal", "hard"):
        raise HTTPException(400, "Invalid difficulty")
    get_client().table("teams").update(updates).eq("id", team_id).execute()
    return {"ok": True}


@router.put("/teams/{team_id}/quest/{quest_id}")
def override_quest(team_id: int, quest_id: int, body: AdminQuestOverride):
    db = get_client()
    now = datetime.now(timezone.utc).isoformat() if body.completed else None
    db.table("team_quest_progress").upsert({
        "team_id": team_id, "quest_id": quest_id,
        "completed": body.completed, "completed_at": now,
    }).execute()
    return {"ok": True}


@router.put("/teams/{team_id}/boss/{boss_id}")
def override_boss(team_id: int, boss_id: int, body: AdminBossOverride):
    db = get_client()
    now = datetime.now(timezone.utc).isoformat() if body.defeated else None
    db.table("team_boss_defeats").upsert({
        "team_id": team_id, "boss_id": boss_id,
        "defeated": body.defeated, "defeated_at": now,
    }).execute()
    return {"ok": True}


@router.post("/teams/{team_id}/reset")
def reset_team(team_id: int):
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    db = get_client()
    db.table("team_quest_progress").update({"completed": False, "completed_at": None}).eq("team_id", team_id).execute()
    db.table("team_boss_defeats").update({"defeated": False, "defeated_at": None}).eq("team_id", team_id).execute()
    return {"ok": True}


@router.post("/reset-all")
def reset_all():
    db = get_client()
    db.table("team_quest_progress").update({"completed": False, "completed_at": None}).neq("team_id", 0).execute()
    db.table("team_boss_defeats").update({"defeated": False, "defeated_at": None}).neq("team_id", 0).execute()
    return {"ok": True}


@router.get("/quests")
def list_quests():
    return [
        {"id": q.id, "boss_id": q.boss_id, "name": q.name,
         "emoji": q.emoji, "type": q.type, "order_index": q.order_index}
        for q in sorted(QUESTS.values(), key=lambda x: (x.boss_id, x.order_index))
    ]


@router.get("/bosses")
def list_bosses():
    return [
        {"id": b.id, "name": b.name, "emoji": b.emoji,
         "location_name": b.location_name, "order_index": b.order_index}
        for b in sorted(BOSSES.values(), key=lambda x: x.order_index)
    ]
