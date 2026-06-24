import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, UploadFile, File
from db import get_client
from models import TeamState, Boss, Quest, QuestOption, DifficultyUpdate, QuestCompleteRequest
from content import (
    BOSSES, QUESTS, BOSS_QUESTS, RAIN_QUESTS, RAIN_BOSS_QUESTS,
    TEAMS, TEAM_TOKENS, TEAM_BY_TOKEN, QuestDef, Diff,
    PhotoQuest, boss_photo_sequence, quest_type,
)
from storage import BUCKET, ALLOWED_EXT

router = APIRouter(prefix="/api/team", tags=["team"])


def _resolve_quest(q: QuestDef, diff: Diff, progress_map: dict) -> Quest:
    options = [QuestOption(**o) for o in diff.options] if diff.options else None
    prog = progress_map.get(q.id, {})
    return Quest(
        id=q.id, boss_id=q.boss_id, name=q.name, emoji=q.emoji, type=q.type,
        description=diff.description, options=options,
        completed=prog.get("completed", False),
        completed_at=prog.get("completed_at"),
        image=q.image,
    )


def _resolve_photo_quest(pq: PhotoQuest, progress_map: dict, locked: bool) -> Quest:
    prog = progress_map.get(pq.id, {})
    return Quest(
        id=pq.id, boss_id=pq.boss_id, name=pq.name, emoji=pq.emoji, type='photo_task',
        description=pq.description, options=[QuestOption(count=1)],
        completed=prog.get("completed", False),
        completed_at=prog.get("completed_at"),
        locked=locked, image=pq.image,
    )


# easy quest IDs ↔ normal/hard quest IDs (same physical task, different format)
_SYNC_PAIRS = [(101, 1), (102, 2), (103, 7)]

def _sync_progress(progress_map: dict) -> dict:
    """Propagate completions across difficulty-equivalent quest pairs."""
    synced = dict(progress_map)
    for a, b in _SYNC_PAIRS:
        a_done = synced.get(a, {}).get("completed", False)
        b_done = synced.get(b, {}).get("completed", False)
        if a_done and not b_done:
            synced[b] = {**synced[a], "quest_id": b}
        elif b_done and not a_done:
            synced[a] = {**synced[b], "quest_id": a}
    return synced


def _rotate(items: list, team_id: int) -> list:
    """Cyclic-shift so each team starts at a different quest (human traffic control)."""
    n = len(items)
    if n <= 1:
        return list(items)
    shift = (team_id - 1) % n
    return items[shift:] + items[:shift]


def _resolve_photo_sequence(seq: list[PhotoQuest], progress_map: dict, team_id: int = 1) -> list[Quest]:
    ordered = _rotate(sorted(seq, key=lambda q: q.order_index), team_id)
    return [_resolve_photo_quest(pq, progress_map, locked=False) for pq in ordered]


def _build_team_state(
    team_id: int,
    difficulty: str,
    quest_progress: list[dict],
    boss_defeats: list[dict],
    rain_mode: bool = False,
) -> TeamState:
    progress_map: dict[int, dict] = _sync_progress({r["quest_id"]: r for r in quest_progress})
    defeat_map:   dict[int, dict] = {r["boss_id"]:  r for r in boss_defeats}

    active_quests    = RAIN_QUESTS    if rain_mode else QUESTS
    active_boss_quests = RAIN_BOSS_QUESTS if rain_mode else BOSS_QUESTS

    boss_list: list[Boss] = []
    for boss_def in sorted(BOSSES.values(), key=lambda b: b.order_index):
        seq = boss_photo_sequence(boss_def.id, difficulty, rain_mode=rain_mode)
        if seq is not None:
            quests = _resolve_photo_sequence(seq, progress_map, team_id)
        else:
            raw = sorted(active_boss_quests[boss_def.id], key=lambda q: q.order_index)
            ordered = _rotate(raw, team_id)
            quests = [_resolve_quest(q, getattr(q, difficulty), progress_map) for q in ordered]
        all_done = bool(quests) and all(q.completed for q in quests)
        defeat = defeat_map.get(boss_def.id, {})
        boss_list.append(Boss(
            id=boss_def.id, name=boss_def.name, emoji=boss_def.emoji,
            location_name=boss_def.location_name,
            location_hint=boss_def.location_hint if all_done else None,
            order_index=boss_def.order_index,
            quests=quests, all_quests_done=all_done,
            defeated=defeat.get("defeated", False),
            defeated_at=defeat.get("defeated_at"),
        ))

    pieces = sum(1 for b in boss_list if b.defeated)
    return TeamState(
        team_id=team_id, token=TEAM_BY_TOKEN.get(team_id, ""),
        name=TEAMS[team_id], difficulty=difficulty,
        bosses=boss_list, puzzle_pieces=pieces, total_bosses=len(boss_list),
        victory=pieces == len(boss_list) and len(boss_list) > 0,
    )


def _fetch_state(team_id: int) -> TeamState:
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    db = get_client()
    team_res   = db.table("teams").select("difficulty").eq("id", team_id).maybe_single().execute()
    difficulty = team_res.data["difficulty"] if team_res.data else "normal"
    progress   = db.table("team_quest_progress").select("*").eq("team_id", team_id).execute().data
    defeats    = db.table("team_boss_defeats").select("*").eq("team_id", team_id).execute().data
    settings   = db.table("game_settings").select("rain_mode").eq("id", 1).maybe_single().execute()
    rain_mode  = (settings.data or {}).get("rain_mode", False)
    return _build_team_state(team_id, difficulty, progress, defeats, rain_mode=rain_mode)


@router.get("/t/{token}", response_model=TeamState)
def get_team_state_by_token(token: str):
    team_id = TEAM_TOKENS.get(token)
    if team_id is None:
        raise HTTPException(404, "Team not found")
    return _fetch_state(team_id)


@router.get("/{team_id}", response_model=TeamState)
def get_team_state(team_id: int):
    return _fetch_state(team_id)


@router.put("/{team_id}/difficulty")
def set_difficulty(team_id: int, body: DifficultyUpdate):
    if body.difficulty not in ("easy", "normal", "hard"):
        raise HTTPException(400, "difficulty must be easy, normal, or hard")
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    get_client().table("teams").update({"difficulty": body.difficulty}).eq("id", team_id).execute()
    return {"ok": True}


@router.post("/{team_id}/quest/{quest_id}/complete")
def complete_quest(team_id: int, quest_id: int, body: QuestCompleteRequest):
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    quest_def = QUESTS.get(quest_id)
    if not quest_def:
        raise HTTPException(404, "Quest not found")

    db = get_client()
    team_res   = db.table("teams").select("difficulty").eq("id", team_id).maybe_single().execute()
    difficulty = team_res.data["difficulty"] if team_res.data else "normal"
    diff: Diff = getattr(quest_def, difficulty)
    options    = diff.options

    if quest_def.type == "photo_task":
        pass
    elif quest_def.type == "drag_match":
        try:
            submitted: dict = json.loads(body.answer_text or "{}")
        except (json.JSONDecodeError, TypeError):
            return {"ok": False, "correct": False}
        correct_map = {o["level"]: o["animal"] for o in (options or [])}
        if submitted != correct_map:
            return {"ok": False, "correct": False}
    elif options and len(options) > 1:
        if body.answer_index is None or body.answer_index < 0 or body.answer_index >= len(options):
            raise HTTPException(400, "Invalid answer index")
        if not options[body.answer_index]["correct"]:
            return {"ok": False, "correct": False}
    elif options and len(options) == 1 and "text" in options[0]:
        if (body.answer_text or "").strip() != options[0]["text"].strip():
            return {"ok": False, "correct": False}

    now = datetime.now(timezone.utc).isoformat()
    db.table("team_quest_progress").upsert({
        "team_id": team_id, "quest_id": quest_id,
        "completed": True, "completed_at": now,
    }).execute()
    return {"ok": True, "correct": True}


@router.post("/{team_id}/quest/{quest_id}/photos")
async def upload_quest_photos(
    team_id: int,
    quest_id: int,
    files: list[UploadFile] = File(...),
):
    """Upload photo-task images to Supabase Storage, then mark the quest done."""
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    qtype = quest_type(quest_id)
    if qtype is None:
        raise HTTPException(404, "Quest not found")
    if qtype != "photo_task":
        raise HTTPException(400, "This quest does not accept photos")
    if not files:
        raise HTTPException(400, "No files uploaded")

    db = get_client()
    store = db.storage.from_(BUCKET)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    uploaded = 0
    for idx, f in enumerate(files):
        data = await f.read()
        if not data:
            continue
        ext = (f.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXT:
            ext = "jpg"
        path = f"team-{team_id}/q{quest_id}-{stamp}-{idx}.{ext}"
        store.upload(
            path,
            data,
            {"content-type": f.content_type or "image/jpeg", "upsert": "true"},
        )
        uploaded += 1

    if uploaded == 0:
        raise HTTPException(400, "No valid images uploaded")

    now = datetime.now(timezone.utc).isoformat()
    db.table("team_quest_progress").upsert({
        "team_id": team_id, "quest_id": quest_id,
        "completed": True, "completed_at": now,
    }).execute()
    return {"ok": True, "correct": True}


@router.post("/{team_id}/boss/{boss_id}/defeat")
def defeat_boss(team_id: int, boss_id: int):
    if team_id not in TEAMS:
        raise HTTPException(404, "Team not found")
    db = get_client()
    team_res   = db.table("teams").select("difficulty").eq("id", team_id).maybe_single().execute()
    difficulty = team_res.data["difficulty"] if team_res.data else "normal"
    seq = boss_photo_sequence(boss_id, difficulty)
    if seq is not None:
        quest_ids = [q.id for q in seq]
    else:
        quest_ids = [q.id for q in BOSS_QUESTS.get(boss_id, [])]
    if quest_ids:
        progress_res = (
            db.table("team_quest_progress")
            .select("quest_id, completed")
            .eq("team_id", team_id)
            .in_("quest_id", quest_ids)
            .execute()
        )
        done = {r["quest_id"] for r in progress_res.data if r["completed"]}
        if not all(qid in done for qid in quest_ids):
            raise HTTPException(400, "Not all quests completed for this boss")
    now = datetime.now(timezone.utc).isoformat()
    db.table("team_boss_defeats").upsert({
        "team_id": team_id, "boss_id": boss_id,
        "defeated": True, "defeated_at": now,
    }).execute()
    return {"ok": True}
