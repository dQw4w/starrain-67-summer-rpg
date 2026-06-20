"""All game content lives here. DB only stores team progress, not this data."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class Diff:
    description: str
    options: Optional[list[dict]] = None


@dataclass
class QuestDef:
    id: int
    boss_id: int
    name: str
    emoji: str
    # type drives photo_task/drag_match detection; UI adapts on options count otherwise
    type: str  # multiple_choice | task | fill_in | photo_task | drag_match
    order_index: int
    easy: Diff
    normal: Diff
    hard: Diff
    image: Optional[str] = None  # illustration shown in the quest modal


@dataclass
class BossDef:
    id: int
    name: str
    emoji: str
    location_name: str
    location_hint: str
    order_index: int


# ── Teams (hardcoded — names never change) ───────────────────────────────────

TEAMS: dict[int, str] = {
    1: "第一探險小隊",
    2: "第二探險小隊",
    3: "第三探險小隊",
}

# ── Bosses ────────────────────────────────────────────────────────────────────

BOSSES: dict[int, BossDef] = {
    1: BossDef(
        id=1, name='米怪', emoji='⭐',
        location_name='新竹市立動物園',
        location_hint='動物園入口旁的大榕樹下，尋找印有爪印的神秘箱子',
        order_index=1,
    ),
    2: BossDef(
        id=2, name='粉怪', emoji='🌸',
        location_name='玻璃工藝博物館',
        location_hint='博物館正門廣場噴水池旁，玻璃球裝置藝術附近',
        order_index=2,
    ),
}

# ── Quests ────────────────────────────────────────────────────────────────────

QUESTS: dict[int, QuestDef] = {

    # ── Boss 1: 米怪（動物園）───────────────────────────────────────────────

    # NOTE: easy mode no longer uses these QUESTS at all (see EASY_QUESTS below).
    # Per design, the 大鴕鳥 question is shifted down one level:
    #   normal difficulty shows the (old) easy version,
    #   hard   difficulty shows the (old) normal version.
    1: QuestDef(
        id=1, boss_id=1, name='神秘大鳥知識王', emoji='🔍',
        type='multiple_choice', order_index=1, image='/ostrich.png',
        easy=Diff(  # unused (easy mode is redesigned) — kept only to satisfy the schema
            description='鴕鳥的速度最快可達多少？',
            options=[
                {"text": "30 km/h", "correct": False},
                {"text": "60 km/h", "correct": True},
                {"text": "90 km/h", "correct": False},
                {"text": "120 km/h", "correct": False},
            ],
        ),
        normal=Diff(  # ← previously the easy version
            description='鴕鳥的速度最快可達多少？',
            options=[
                {"text": "30 km/h", "correct": False},
                {"text": "60 km/h", "correct": True},
                {"text": "90 km/h", "correct": False},
                {"text": "120 km/h", "correct": False},
            ],
        ),
        hard=Diff(  # ← previously the normal version
            description='下列何者不是鴕鳥的特徵？',
            options=[
                {"text": "體重可達150公斤", "correct": False},
                {"text": "最快跑步速度為30 km/h", "correct": True},
                {"text": "雄性羽毛為黑色或白色", "correct": False},
                {"text": "具有2根腳趾", "correct": False},
            ],
        ),
    ),

    2: QuestDef(
        id=2, boss_id=1, name='靈長目大集合', emoji='🐒',
        type='photo_task', order_index=2,
        easy=Diff(
            description='在動物園找到 1 種靈長目動物（猴子、猩猩等），全隊一起跟牠拍照！',
            options=[{"count": 1}],
        ),
        normal=Diff(
            description='在動物園找到 2 種不同的靈長目動物，全隊分別跟每種合照！',
            options=[{"count": 2}],
        ),
        hard=Diff(
            description='在動物園找到 3 種不同的靈長目動物，全隊分別跟每種合照！',
            options=[{"count": 3}],
        ),
    ),

    7: QuestDef(
        id=7, boss_id=1, name='動物保育知多少', emoji='🌿',
        type='drag_match', order_index=3,
        easy=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                {"animal": "台灣梅花鹿", "level": "無危 LC"},
            ],
        ),
        # normal: 3 pairs
        normal=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                # {"animal": "婆羅洲紅毛猩猩", "level": "極危 CR"},
                {"animal": "蘇卡達象龜",     "level": "瀕危 EN"},
                {"animal": "台灣梅花鹿",     "level": "無危 LC"},
            ],
        ),
        # hard: all 4 pairs
        hard=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                # {"animal": "婆羅洲紅毛猩猩", "level": "極危 CR"},
                {"animal": "蘇卡達象龜",     "level": "瀕危 EN"},
                {"animal": "河馬",           "level": "易危 VU"},
                {"animal": "台灣梅花鹿",     "level": "無危 LC"},
            ],
        ),
    ),

    # Boss 2（粉怪・玻工館）has no QuestDef entries — for every difficulty it uses
    # the glass-exhibit photo sequence defined in BOSS2_GLASS below.
}

# ── Derived index: boss_id → list of quests ──────────────────────────────────

BOSS_QUESTS: dict[int, list[QuestDef]] = {bid: [] for bid in BOSSES}
for _q in QUESTS.values():
    BOSS_QUESTS[_q.boss_id].append(_q)


# ── Sequential photo-task quests ─────────────────────────────────────────────
# A "find it and take a group photo" task. They are completed in order: each one
# stays locked until the previous in the same boss is done. Two uses:
#   • Boss 1 easy mode  → visit 3 animals (no reference image)
#   • Boss 2 every mode → find 3 glass exhibits (with a reference photo to match)

@dataclass
class PhotoQuest:
    id: int
    boss_id: int
    name: str
    emoji: str
    description: str
    order_index: int
    image: Optional[str] = None   # reference image URL shown to the team (served from /public)


# Boss 1（米怪・動物園）— easy mode only: 3 animals drawn from the regular questions
BOSS1_EASY_ANIMALS: list[PhotoQuest] = [
    PhotoQuest(101, 1, '台灣梅花鹿',     '🦌', '找到【台灣梅花鹿】，全隊一起在牠前面拍一張開心的合照並上傳！📸', 1),
    PhotoQuest(102, 1, '婆羅洲紅毛猩猩', '🦧', '找到【婆羅洲紅毛猩猩】，全隊一起在牠前面拍一張合照並上傳！📸', 2),
    PhotoQuest(103, 1, '蘇卡達象龜',     '🐢', '找到【蘇卡達象龜】，全隊一起在牠前面拍一張合照並上傳！📸', 3),
]

# Boss 2（粉怪・玻工館）— every difficulty: find 3 glass exhibits matching the photos
BOSS2_GLASS: list[PhotoQuest] = [
    PhotoQuest(201, 2, '玻璃展品 ①', '🔍', '找到照片中的這件玻璃展品，全隊一起在它前面拍一張合照並上傳！📸', 1, image='/glass-1.jpg'),
    PhotoQuest(202, 2, '玻璃展品 ②', '🔎', '找到照片中的這件玻璃展品，全隊一起在它前面拍一張合照並上傳！📸', 2, image='/glass-2.jpg'),
    PhotoQuest(203, 2, '玻璃展品 ③', '✨', '找到照片中的這件玻璃展品，全隊一起在它前面拍一張合照並上傳！📸', 3, image='/glass-3.jpg'),
]

PHOTO_QUESTS: dict[int, PhotoQuest] = {
    q.id: q for q in (*BOSS1_EASY_ANIMALS, *BOSS2_GLASS)
}


def boss_photo_sequence(boss_id: int, difficulty: str) -> Optional[list[PhotoQuest]]:
    """The photo-task sequence for a boss, or None to use the regular QUESTS."""
    if boss_id == 2:
        return BOSS2_GLASS                       # all difficulties
    if boss_id == 1 and difficulty == "easy":
        return BOSS1_EASY_ANIMALS
    return None


def quest_type(quest_id: int) -> Optional[str]:
    """Resolve a quest's type across the regular and photo-task sets."""
    if quest_id in QUESTS:
        return QUESTS[quest_id].type
    if quest_id in PHOTO_QUESTS:
        return 'photo_task'
    return None


def quest_name(quest_id: int) -> Optional[str]:
    if quest_id in QUESTS:
        return QUESTS[quest_id].name
    if quest_id in PHOTO_QUESTS:
        return PHOTO_QUESTS[quest_id].name
    return None
