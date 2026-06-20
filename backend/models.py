from typing import Optional
from pydantic import BaseModel


class QuestOption(BaseModel):
    text: Optional[str] = None      # multiple_choice / fill_in
    correct: Optional[bool] = None  # multiple_choice
    count: Optional[int] = None     # photo_task
    animal: Optional[str] = None    # drag_match
    level: Optional[str] = None     # drag_match


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
    locked: bool = False          # revealed only after the previous quest is done
    image: Optional[str] = None   # reference image for photo tasks (e.g. the glass exhibit to find)


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
    answer_index: Optional[int] = None   # for multiple_choice
    answer_text: Optional[str] = None    # for fill_in (hard difficulty)


class AdminTeamUpdate(BaseModel):
    difficulty: Optional[str] = None
    name: Optional[str] = None


class AdminQuestOverride(BaseModel):
    completed: bool


class AdminBossOverride(BaseModel):
    defeated: bool


class PhotoDeleteRequest(BaseModel):
    names: list[str]            # file names within a team's folder
