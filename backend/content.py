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

# URL tokens — change these before the event if desired
TEAM_TOKENS: dict[str, int] = {
    "r7kx2wqp": 1,
    "m4jb9fz6": 2,
    "ycz4ns7d": 3,
}
TEAM_BY_TOKEN: dict[int, str] = {v: k for k, v in TEAM_TOKENS.items()}

# ── Bosses ────────────────────────────────────────────────────────────────────

BOSSES: dict[int, BossDef] = {
    1: BossDef(
        id=1, name='米怪', emoji='⭐',
        location_name='新竹市立動物園',
        location_hint='馬來熊對面的涼亭座椅區',
        order_index=1,
    ),
    2: BossDef(
        id=2, name='粉怪', emoji='🌸',
        location_name='新竹市立動物園',
        location_hint='河馬後面的長椅',
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
        normal=Diff(
            description='鴕鳥的速度最快可達多少？',
            options=[
                {"text": "30 km/h", "correct": False},
                {"text": "60 km/h", "correct": True},
                {"text": "90 km/h", "correct": False},
                {"text": "120 km/h", "correct": False},
            ],
        ),
        hard=Diff(
            description='下列何者「不是」鴕鳥的特徵？',
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
        normal=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                {"animal": "婆羅洲紅毛猩猩", "level": "極危 CR"},
                {"animal": "台灣梅花鹿",     "level": "無危 LC"},
            ],
        ),
        hard=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                {"animal": "婆羅洲紅毛猩猩", "level": "極危 CR"},
                {"animal": "河馬",           "level": "易危 VU"},
                {"animal": "台灣梅花鹿",     "level": "無危 LC"},
            ],
        ),
    ),

    # ── Boss 2: 粉怪（動物園）───────────────────────────────────────────────

    201: QuestDef(
        id=201, boss_id=2, name='好棒鴨的新家', emoji='🏠',
        type='photo_task', order_index=1,
        easy=Diff(
            description='好棒鴨被解救之後，想搬到動物園住！請小隊一起討論，找出你們認為最適合好棒鴨居住的地方，拍照上傳！📸',
            options=[{"count": 1}],
        ),
        normal=Diff(
            description='好棒鴨被解救之後，想搬到動物園住！請小隊一起討論，找出你們認為最適合好棒鴨居住的地方，拍照上傳！📸',
            options=[{"count": 1}],
        ),
        hard=Diff(
            description='好棒鴨被解救之後，想搬到動物園住！請小隊一起討論，找出你們認為最適合好棒鴨居住的地方，拍照上傳！📸',
            options=[{"count": 1}],
        ),
    ),

    202: QuestDef(
        id=202, boss_id=2, name='好棒鴨的新朋友', emoji='🤝',
        type='photo_task', order_index=2,
        easy=Diff(
            description='好棒鴨想在動物園交一個新朋友！請小隊一起討論哪隻動物最適合當好棒鴨的朋友，找到牠並拍照上傳！📸',
            options=[{"count": 1}],
        ),
        normal=Diff(
            description='好棒鴨想在動物園交一個新朋友！請小隊一起討論哪隻動物最適合當好棒鴨的朋友，找到牠並拍照上傳！📸',
            options=[{"count": 1}],
        ),
        hard=Diff(
            description='好棒鴨想在動物園交一個新朋友！請小隊一起討論哪隻動物最適合當好棒鴨的朋友，找到牠並拍照上傳！📸',
            options=[{"count": 1}],
        ),
    ),

    203: QuestDef(
        id=203, boss_id=2, name='動物大哉問', emoji='💬',
        type='task', order_index=3,
        easy=Diff(
            description='請每個小隊員都說出自己最喜歡的動物！',
        ),
        normal=Diff(
            description='請每個小隊員都說出自己最喜歡的動物，並且說明原因！',
        ),
        hard=Diff(
            description='你們認為動物園是否應該存在？為什麼？請每個小隊員分享自己的想法。',
        ),
    ),
}

# ── Derived index: boss_id → list of quests ──────────────────────────────────

BOSS_QUESTS: dict[int, list[QuestDef]] = {bid: [] for bid in BOSSES}
for _q in QUESTS.values():
    BOSS_QUESTS[_q.boss_id].append(_q)


# ── Rain-backup quests (placeholder — replace with real content before event) ─

_NI = Diff(description='Not Implemented', options=[{"text": "Not Implemented", "correct": True}])
_NI_PHOTO = Diff(description='Not Implemented', options=[{"count": 1}])
_NI_DRAG = Diff(description='Not Implemented', options=[{"animal": "Not Implemented", "level": "無危 LC"}])

RAIN_QUESTS: dict[int, QuestDef] = {
    1: QuestDef(
        id=1, boss_id=1, name='Not Implemented', emoji='🚧',
        type='multiple_choice', order_index=1,
        easy=_NI, normal=_NI, hard=_NI,
    ),
    2: QuestDef(
        id=2, boss_id=1, name='Not Implemented', emoji='🚧',
        type='photo_task', order_index=2,
        easy=_NI_PHOTO, normal=_NI_PHOTO, hard=_NI_PHOTO,
    ),
    7: QuestDef(
        id=7, boss_id=1, name='Not Implemented', emoji='🚧',
        type='drag_match', order_index=3,
        easy=_NI_DRAG, normal=_NI_DRAG, hard=_NI_DRAG,
    ),
    201: QuestDef(
        id=201, boss_id=2, name='Not Implemented', emoji='🚧',
        type='photo_task', order_index=1,
        easy=_NI_PHOTO, normal=_NI_PHOTO, hard=_NI_PHOTO,
    ),
    202: QuestDef(
        id=202, boss_id=2, name='Not Implemented', emoji='🚧',
        type='photo_task', order_index=2,
        easy=_NI_PHOTO, normal=_NI_PHOTO, hard=_NI_PHOTO,
    ),
    203: QuestDef(
        id=203, boss_id=2, name='Not Implemented', emoji='🚧',
        type='task', order_index=3,
        easy=Diff(description='Not Implemented'),
        normal=Diff(description='Not Implemented'),
        hard=Diff(description='Not Implemented'),
    ),
}

RAIN_BOSS_QUESTS: dict[int, list[QuestDef]] = {bid: [] for bid in BOSSES}
for _q in RAIN_QUESTS.values():
    RAIN_BOSS_QUESTS[_q.boss_id].append(_q)


# ── Sequential photo-task quests (Boss 1 easy mode only) ─────────────────────

@dataclass
class PhotoQuest:
    id: int
    boss_id: int
    name: str
    emoji: str
    description: str
    order_index: int
    image: Optional[str] = None   # reference image URL shown to the team (served from /public)


# Boss 1（米怪・動物園）— easy mode only
BOSS1_EASY_ANIMALS: list[PhotoQuest] = [
    PhotoQuest(101, 1, '鴕鳥',           '🦤', '找到【鴕鳥】，全隊一起在牠前面拍一張合照並上傳！📸',           1, image='/ostrich.png'),
    PhotoQuest(102, 1, '婆羅洲紅毛猩猩', '🦧', '找到【婆羅洲紅毛猩猩】，全隊一起在牠前面拍一張合照並上傳！📸', 2, image='/gorilla.png'),
    PhotoQuest(103, 1, '台灣梅花鹿',     '🦌', '找到【台灣梅花鹿】，全隊一起在牠前面拍一張開心的合照並上傳！📸', 3, image='/deer.png'),
]

RAIN_BOSS1_EASY_ANIMALS: list[PhotoQuest] = [
    PhotoQuest(101, 1, 'Not Implemented', '🚧', 'Not Implemented', 1),
    PhotoQuest(102, 1, 'Not Implemented', '🚧', 'Not Implemented', 2),
    PhotoQuest(103, 1, 'Not Implemented', '🚧', 'Not Implemented', 3),
]

PHOTO_QUESTS: dict[int, PhotoQuest] = {
    q.id: q for q in BOSS1_EASY_ANIMALS
}


def boss_photo_sequence(boss_id: int, difficulty: str, rain_mode: bool = False) -> Optional[list[PhotoQuest]]:
    """The photo-task sequence for a boss, or None to use the regular QUESTS."""
    if boss_id == 1 and difficulty == "easy":
        return RAIN_BOSS1_EASY_ANIMALS if rain_mode else BOSS1_EASY_ANIMALS
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
