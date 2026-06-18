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
        type='multiple_choice', order_index=1,
        easy=Diff(  # unused (easy mode is redesigned) — kept only to satisfy the schema
            description='大鴕鳥的速度最快可達多少？',
            options=[
                {"text": "30 km/h", "correct": False},
                {"text": "60 km/h", "correct": True},
                {"text": "90 km/h", "correct": False},
                {"text": "120 km/h", "correct": False},
            ],
        ),
        normal=Diff(  # ← previously the easy version
            description='大鴕鳥的速度最快可達多少？',
            options=[
                {"text": "30 km/h", "correct": False},
                {"text": "60 km/h", "correct": True},
                {"text": "90 km/h", "correct": False},
                {"text": "120 km/h", "correct": False},
            ],
        ),
        hard=Diff(  # ← previously the normal version
            description='下列何者不是大鴕鳥的特徵？',
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
        # easy: 2 pairs (最極端的兩個)
        easy=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                {"animal": "婆羅洲紅毛猩猩", "level": "極危 CR"},
                {"animal": "台灣梅花鹿",     "level": "無危 LC"},
            ],
        ),
        # normal: 3 pairs
        normal=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                {"animal": "婆羅洲紅毛猩猩", "level": "極危 CR"},
                {"animal": "蘇卡達象龜",     "level": "瀕危 EN"},
                {"animal": "台灣梅花鹿",     "level": "無危 LC"},
            ],
        ),
        # hard: all 4 pairs
        hard=Diff(
            description='連線配對：把每隻動物和牠的保育等級連起來！',
            options=[
                {"animal": "婆羅洲紅毛猩猩", "level": "極危 CR"},
                {"animal": "蘇卡達象龜",     "level": "瀕危 EN"},
                {"animal": "河馬",           "level": "易危 VU"},
                {"animal": "台灣梅花鹿",     "level": "無危 LC"},
            ],
        ),
    ),

    # ── Boss 2: 粉怪（玻璃博物館 + 孔廟）───────────────────────────────────

    3: QuestDef(
        id=3, boss_id=2, name='玻璃小達人', emoji='✨',
        type='multiple_choice', order_index=1,
        easy=Diff(
            description='玻璃是透明的，這是真的嗎？',
            options=[
                {"text": "是真的！", "correct": True},
                {"text": "玻璃是不透明的", "correct": False},
            ],
        ),
        normal=Diff(
            description='玻璃主要是用什麼原料製作的？',
            options=[
                {"text": "沙子", "correct": True},
                {"text": "石頭", "correct": False},
                {"text": "水", "correct": False},
                {"text": "木頭", "correct": False},
            ],
        ),
        hard=Diff(
            description='在博物館中找到3種不同種類的玻璃工藝品，分別描述它們的製作技法或特色。',
        ),
    ),

    4: QuestDef(
        id=4, boss_id=2, name='創意設計師', emoji='🎨',
        type='task', order_index=2,
        easy=Diff(
            description='在博物館中找到你覺得最漂亮的玻璃作品，告訴大家你喜歡它哪裡。',
        ),
        normal=Diff(
            description='用紙筆畫下（或口頭描述）你最喜歡的一件玻璃藝品，說明它的形狀和顏色。',
        ),
        hard=Diff(
            description='設計一個你自己的玻璃藝品：說明它的形狀、顏色、用途，以及為什麼你想做這個。',
        ),
    ),

    5: QuestDef(
        id=5, boss_id=2, name='孔廟小學者', emoji='📚',
        type='multiple_choice', order_index=3,
        easy=Diff(
            description='孔子是一位很有名的老師，這是真的嗎？',
            options=[
                {"text": "是真的！", "correct": True},
                {"text": "他是一位廚師", "correct": False},
            ],
        ),
        normal=Diff(
            description='孔子教我們要用什麼態度對待長輩？',
            options=[
                {"text": "尊敬", "correct": True},
                {"text": "忽視", "correct": False},
                {"text": "嘲笑", "correct": False},
                {"text": "命令", "correct": False},
            ],
        ),
        hard=Diff(
            description='孔廟裡有哪些主要建築？找到至少3棟並說明每棟的名稱和功能。',
        ),
    ),

    6: QuestDef(
        id=6, boss_id=2, name='孔廟探險家', emoji='🗺️',
        type='task', order_index=4,
        easy=Diff(
            description='在孔廟找到「大成殿」的牌匾，告訴隊長你找到了。',
        ),
        normal=Diff(
            description='找到孔廟裡的石碑，念出上面你看得懂的一個字，並說說它是什麼意思。',
        ),
        hard=Diff(
            description='找到孔廟的5種不同裝飾元素（龍、鳳、花紋等），說明每個裝飾出現在哪裡、代表什麼意義。',
        ),
    ),
}

# ── Derived index: boss_id → list of quests ──────────────────────────────────

BOSS_QUESTS: dict[int, list[QuestDef]] = {bid: [] for bid in BOSSES}
for _q in QUESTS.values():
    BOSS_QUESTS[_q.boss_id].append(_q)


# ── Easy mode (completely separate) ──────────────────────────────────────────
# Easy mode replaces all of the above with a sequence of "visit this animal and
# take a group photo" tasks. They must be completed in order: a task stays locked
# until the previous one in the same boss is done. The 5 animals (all drawn from
# the regular questions) are split across the two existing bosses.

@dataclass
class EasyQuest:
    id: int
    boss_id: int
    name: str          # the animal's name (shown as the quest title)
    emoji: str
    description: str
    order_index: int


def _photo_desc(animal: str) -> str:
    return f'找到【{animal}】，全隊一起在牠前面拍一張開心的合照並上傳！📸'


EASY_QUESTS: dict[int, EasyQuest] = {
    # Boss 1（米怪・動物園）
    101: EasyQuest(101, 1, '台灣梅花鹿',     '🦌', _photo_desc('台灣梅花鹿'),     1),
    102: EasyQuest(102, 1, '婆羅洲紅毛猩猩', '🦧', _photo_desc('婆羅洲紅毛猩猩'), 2),
    103: EasyQuest(103, 1, '蘇卡達象龜',     '🐢', _photo_desc('蘇卡達象龜'),     3),
    # Boss 2（粉怪）
    104: EasyQuest(104, 2, '河馬',           '🦛', _photo_desc('河馬'),           1),
    105: EasyQuest(105, 2, '大鴕鳥',         '🦤', _photo_desc('大鴕鳥'),         2),
}

EASY_BOSS_QUESTS: dict[int, list[EasyQuest]] = {bid: [] for bid in BOSSES}
for _eq in EASY_QUESTS.values():
    EASY_BOSS_QUESTS[_eq.boss_id].append(_eq)


def quest_type(quest_id: int) -> Optional[str]:
    """Resolve a quest's type across both the regular and easy-mode sets."""
    if quest_id in QUESTS:
        return QUESTS[quest_id].type
    if quest_id in EASY_QUESTS:
        return 'photo_task'
    return None


def quest_name(quest_id: int) -> Optional[str]:
    if quest_id in QUESTS:
        return QUESTS[quest_id].name
    if quest_id in EASY_QUESTS:
        return EASY_QUESTS[quest_id].name
    return None
