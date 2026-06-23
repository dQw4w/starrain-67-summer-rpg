import io
import zipfile
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from db import get_client
from models import AdminTeamUpdate, AdminQuestOverride, AdminBossOverride, PhotoDeleteRequest
from routers.team import _fetch_state
from content import BOSSES, QUESTS, TEAMS, TEAM_BY_TOKEN, quest_name
from storage import BUCKET, media_type_for

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/teams")
def list_teams():
    db = get_client()
    rows = db.table("teams").select("id, difficulty").order("id").execute().data
    diff_map = {r["id"]: r["difficulty"] for r in rows}
    return [
        {"id": tid, "name": name, "difficulty": diff_map.get(tid, "normal"), "token": TEAM_BY_TOKEN.get(tid, "")}
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


# ── Team photo download ───────────────────────────────────────────────────────

def _safe_name(name: str) -> str:
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, "Invalid file name")
    return name


def _list_team_files(team_id: int) -> list[dict]:
    """List photo objects stored under team-{team_id}/, parsing the quest id."""
    store = get_client().storage.from_(BUCKET)
    try:
        items = store.list(f"team-{team_id}")
    except Exception:
        return []
    files: list[dict] = []
    for it in items:
        name = it.get("name") if isinstance(it, dict) else getattr(it, "name", None)
        if not name or name.startswith("."):  # skip folder placeholders
            continue
        qid = None
        if name.startswith("q"):
            head = name[1:].split("-", 1)[0]
            if head.isdigit():
                qid = int(head)
        files.append({"name": name, "quest_id": qid})
    files.sort(key=lambda x: (x["quest_id"] or 0, x["name"]))
    return files


@router.get("/teams/{team_id}/photos")
def list_team_photos(team_id: int):
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    return [
        {
            "name": f["name"],
            "quest_id": f["quest_id"],
            "quest_name": quest_name(f["quest_id"]) if f["quest_id"] else None,
            "url": f"/api/admin/teams/{team_id}/photo/{f['name']}",
        }
        for f in _list_team_files(team_id)
    ]


@router.get("/teams/{team_id}/photo/{name}")
def get_team_photo(team_id: int, name: str, dl: int = 0):
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    _safe_name(name)
    try:
        data = get_client().storage.from_(BUCKET).download(f"team-{team_id}/{name}")
    except Exception:
        raise HTTPException(404, "Photo not found")
    headers = {}
    if dl:
        headers["Content-Disposition"] = f'attachment; filename="{name}"'
    return Response(content=data, media_type=media_type_for(name), headers=headers)


@router.get("/teams/{team_id}/photos.zip")
def download_team_photos_zip(team_id: int):
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    files = _list_team_files(team_id)
    if not files:
        raise HTTPException(404, "No photos for this team")
    store = get_client().storage.from_(BUCKET)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files:
            try:
                data = store.download(f"team-{team_id}/{f['name']}")
            except Exception:
                continue
            folder = f"quest-{f['quest_id']}" if f["quest_id"] else "other"
            zf.writestr(f"{folder}/{f['name']}", data)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="team-{team_id}-photos.zip"'},
    )


@router.delete("/teams/{team_id}/photos")
def delete_team_photos(team_id: int):
    """Delete every photo for one team."""
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    files = _list_team_files(team_id)
    if not files:
        return {"ok": True, "deleted": 0}
    paths = [f"team-{team_id}/{f['name']}" for f in files]
    get_client().storage.from_(BUCKET).remove(paths)
    return {"ok": True, "deleted": len(paths)}


@router.post("/teams/{team_id}/photos/delete")
def delete_selected_photos(team_id: int, body: PhotoDeleteRequest):
    """Delete specific photos (by file name) for one team."""
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    names = [_safe_name(n) for n in body.names]
    if not names:
        raise HTTPException(400, "No photos selected")
    paths = [f"team-{team_id}/{n}" for n in names]
    get_client().storage.from_(BUCKET).remove(paths)
    return {"ok": True, "deleted": len(paths)}


@router.delete("/photos")
def delete_all_photos():
    """Delete every photo from every team."""
    store = get_client().storage.from_(BUCKET)
    removed = 0
    for team_id in TEAMS:
        files = _list_team_files(team_id)
        if not files:
            continue
        paths = [f"team-{team_id}/{f['name']}" for f in files]
        try:
            store.remove(paths)
            removed += len(paths)
        except Exception:
            pass
    return {"ok": True, "deleted": removed}


@router.get("/photos.zip")
def download_all_photos_zip():
    """One ZIP with every team's photos, foldered by team then quest."""
    store = get_client().storage.from_(BUCKET)
    buf = io.BytesIO()
    total = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for team_id, team_name in sorted(TEAMS.items()):
            safe_team = "".join(c for c in team_name if c not in '/\\:*?"<>|').strip() or f"team-{team_id}"
            team_dir = f"{team_id:02d}-{safe_team}"
            for f in _list_team_files(team_id):
                try:
                    data = store.download(f"team-{team_id}/{f['name']}")
                except Exception:
                    continue
                quest_dir = f"quest-{f['quest_id']}" if f["quest_id"] else "other"
                zf.writestr(f"{team_dir}/{quest_dir}/{f['name']}", data)
                total += 1
    if total == 0:
        raise HTTPException(404, "No photos uploaded yet")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="all-teams-photos.zip"'},
    )


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
