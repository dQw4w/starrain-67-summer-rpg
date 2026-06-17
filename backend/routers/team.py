from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from db import get_client
from models import TeamState, Boss, Quest, QuestOption, DifficultyUpdate, QuestCompleteRequest
from content import BOSSES, QUESTS, BOSS_QUESTS, QuestDef, Diff

router = APIRouter(prefix="/api/team", tags=["team"])


def _resolve_quest(q: QuestDef, diff: Diff, progress_map: dict) -> Quest:
    options = [QuestOption(**o) for o in diff.options] if diff.options else None
    prog = progress_map.get(q.id, {})
    return Quest(
        id=q.id,
        boss_id=q.boss_id,
        name=q.name,
        emoji=q.emoji,
        type=q.type,
        description=diff.description,
        options=options,
        completed=prog.get("completed", False),
        completed_at=prog.get("completed_at"),
    )


def _build_team_state(team: dict, quest_progress: list, boss_defeats: list) -> TeamState:
    difficulty = team["difficulty"]
    progress_map: dict[int, dict] = {r["quest_id"]: r for r in quest_progress}
    defeat_map: dict[int, dict] = {r["boss_id"]: r for r in boss_defeats}

    boss_list: list[Boss] = []
    for boss_def in sorted(BOSSES.values(), key=lambda b: b.order_index):
        quests = [
            _resolve_quest(q, getattr(q, difficulty), progress_map)
            for q in sorted(BOSS_QUESTS[boss_def.id], key=lambda q: q.order_index)
        ]
        all_done = bool(quests) and all(q.completed for q in quests)
        defeat = defeat_map.get(boss_def.id, {})
        defeated = defeat.get("defeated", False)
        boss_list.append(Boss(
            id=boss_def.id,
            name=boss_def.name,
            emoji=boss_def.emoji,
            location_name=boss_def.location_name,
            location_hint=boss_def.location_hint if all_done else None,
            order_index=boss_def.order_index,
            quests=quests,
            all_quests_done=all_done,
            defeated=defeated,
            defeated_at=defeat.get("defeated_at"),
        ))

    pieces = sum(1 for b in boss_list if b.defeated)
    return TeamState(
        team_id=team["id"],
        name=team["name"],
        difficulty=difficulty,
        bosses=boss_list,
        puzzle_pieces=pieces,
        total_bosses=len(boss_list),
        victory=pieces == len(boss_list) and len(boss_list) > 0,
    )


def _fetch_state(team_id: int) -> TeamState:
    db = get_client()
    team_res = db.table("teams").select("*").eq("id", team_id).maybe_single().execute()
    if not team_res.data:
        raise HTTPException(404, "Team not found")
    progress = db.table("team_quest_progress").select("*").eq("team_id", team_id).execute().data
    defeats = db.table("team_boss_defeats").select("*").eq("team_id", team_id).execute().data
    return _build_team_state(team_res.data, progress, defeats)


@router.get("/{team_id}", response_model=TeamState)
def get_team_state(team_id: int):
    return _fetch_state(team_id)


@router.put("/{team_id}/difficulty")
def set_difficulty(team_id: int, body: DifficultyUpdate):
    if body.difficulty not in ("easy", "normal", "hard"):
        raise HTTPException(400, "difficulty must be easy, normal, or hard")
    db = get_client()
    res = db.table("teams").update({"difficulty": body.difficulty}).eq("id", team_id).execute()
    if not res.data:
        raise HTTPException(404, "Team not found")
    return {"ok": True}


@router.post("/{team_id}/quest/{quest_id}/complete")
def complete_quest(team_id: int, quest_id: int, body: QuestCompleteRequest):
    db = get_client()

    team_res = db.table("teams").select("difficulty").eq("id", team_id).maybe_single().execute()
    if not team_res.data:
        raise HTTPException(404, "Team not found")

    quest_def = QUESTS.get(quest_id)
    if not quest_def:
        raise HTTPException(404, "Quest not found")

    difficulty = team_res.data["difficulty"]
    diff: Diff = getattr(quest_def, difficulty)
    options = diff.options  # raw dicts for validation

    if quest_def.type == "photo_task":
        pass  # staff verify photos in person; always accepted
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
        "team_id": team_id,
        "quest_id": quest_id,
        "completed": True,
        "completed_at": now,
    }).execute()
    return {"ok": True, "correct": True}


@router.post("/{team_id}/boss/{boss_id}/defeat")
def defeat_boss(team_id: int, boss_id: int):
    db = get_client()

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
        "team_id": team_id,
        "boss_id": boss_id,
        "defeated": True,
        "defeated_at": now,
    }).execute()
    return {"ok": True}
