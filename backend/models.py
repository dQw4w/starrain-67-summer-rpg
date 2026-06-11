from typing import Optional
from pydantic import BaseModel


class QuestOption(BaseModel):
    text: str
    correct: bool


class Quest(BaseModel):
    id: int
    boss_id: int
    name: str
    emoji: str
    type: str
    description: str          # resolved for current difficulty
    options: Optional[list[QuestOption]] = None
    completed: bool = False
    completed_at: Optional[str] = None


class Boss(BaseModel):
    id: int
    name: str
    emoji: str
    location_name: str
    location_hint: Optional[str] = None  # only revealed when ready
    order_index: int
    quests: list[Quest] = []
    all_quests_done: bool = False
    defeated: bool = False
    defeated_at: Optional[str] = None


class TeamState(BaseModel):
    team_id: int
    name: str
    difficulty: str
    bosses: list[Boss]
    puzzle_pieces: int          # number of bosses defeated
    total_bosses: int
    victory: bool


class DifficultyUpdate(BaseModel):
    difficulty: str             # 'easy' | 'normal' | 'hard'


class QuestCompleteRequest(BaseModel):
    answer_index: Optional[int] = None   # for multiple_choice; None for task


class AdminTeamUpdate(BaseModel):
    difficulty: Optional[str] = None
    name: Optional[str] = None


class AdminQuestOverride(BaseModel):
    completed: bool


class AdminBossOverride(BaseModel):
    defeated: bool
