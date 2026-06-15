from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException
from db import get_client
from models import (
    TeamState, Boss, Quest, QuestOption,
    DifficultyUpdate, QuestCompleteRequest,
)

router = APIRouter(prefix="/api/team", tags=["team"])


def _resolve_quest(raw: dict, difficulty: str, progress: dict) -> Quest:
    desc = raw[f"description_{difficulty}"]
    options_raw: list[dict] | None = raw.get(f"options_{difficulty}")
    options = [QuestOption(**o) for o in options_raw] if options_raw else None
    prog = progress.get(raw["id"], {})
    return Quest(
        id=raw["id"],
        boss_id=raw["boss_id"],
        name=raw["name"],
        emoji=raw["emoji"],
        type=raw["type"],
        description=desc,
        options=options,
        completed=prog.get("completed", False),
        completed_at=prog.get("completed_at"),
    )


def _build_team_state(team: dict, bosses_raw: list, quests_raw: list,
                      quest_progress: list, boss_defeats: list) -> TeamState:
    difficulty = team["difficulty"]

    progress_map: dict[int, dict] = {r["quest_id"]: r for r in quest_progress}
    defeat_map: dict[int, dict] = {r["boss_id"]: r for r in boss_defeats}

    boss_list: list[Boss] = []
    for b in sorted(bosses_raw, key=lambda x: x["order_index"]):
        bqs = [q for q in quests_raw if q["boss_id"] == b["id"]]
        bqs.sort(key=lambda x: x["order_index"])
        resolved = [_resolve_quest(q, difficulty, progress_map) for q in bqs]
        all_done = bool(resolved) and all(q.completed for q in resolved)
        defeat = defeat_map.get(b["id"], {})
        defeated = defeat.get("defeated", False)
        boss_list.append(Boss(
            id=b["id"],
            name=b["name"],
            emoji=b["emoji"],
            location_name=b["location_name"],
            location_hint=b["location_hint"] if all_done else None,
            order_index=b["order_index"],
            quests=resolved,
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

    bosses = db.table("bosses").select("*").execute().data
    quests = db.table("quests").select("*").execute().data
    progress = db.table("team_quest_progress").select("*").eq("team_id", team_id).execute().data
    defeats = db.table("team_boss_defeats").select("*").eq("team_id", team_id).execute().data

    return _build_team_state(team_res.data, bosses, quests, progress, defeats)


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

    # Verify team exists
    team_res = db.table("teams").select("difficulty").eq("id", team_id).maybe_single().execute()
    if not team_res.data:
        raise HTTPException(404, "Team not found")

    difficulty = team_res.data["difficulty"]
    quest_res = db.table("quests").select("*").eq("id", quest_id).maybe_single().execute()
    if not quest_res.data:
        raise HTTPException(404, "Quest not found")

    quest = quest_res.data
    options: list[dict] | None = quest.get(f"options_{difficulty}")

    if options and len(options) > 1:
        # Multiple choice: validate answer_index
        if body.answer_index is None or body.answer_index < 0 or body.answer_index >= len(options):
            raise HTTPException(400, "Invalid answer index")
        if not options[body.answer_index]["correct"]:
            return {"ok": False, "correct": False}
    elif options and len(options) == 1:
        # Fill-in: validate answer_text against options[0]["text"]
        correct_answer = options[0]["text"].strip()
        submitted = (body.answer_text or "").strip()
        if submitted != correct_answer:
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

    # Ensure all quests for this boss are done
    quests_res = db.table("quests").select("id").eq("boss_id", boss_id).execute()
    quest_ids = [q["id"] for q in quests_res.data]
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
