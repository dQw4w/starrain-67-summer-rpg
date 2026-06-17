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
    # type drives photo_task detection; UI adapts based on options count
    type: str  # multiple_choice | task | fill_in | photo_task
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

    1: QuestDef(
        id=1, boss_id=1, name='神秘大鳥知識王', emoji='🔍',
        type='fill_in', order_index=1,
        easy=Diff(
            description='大鴕鳥的速度最快可達多少？',
            options=[
                {"text": "30 km/h", "correct": False},
                {"text": "60 km/h", "correct": True},
                {"text": "90 km/h", "correct": False},
                {"text": "120 km/h", "correct": False},
            ],
        ),
        normal=Diff(
            description='下列何者不是大鴕鳥的特徵？',
            options=[
                {"text": "體重可達150公斤", "correct": False},
                {"text": "最快跑步速度為30 km/h", "correct": True},
                {"text": "雄性羽毛為黑色或白色", "correct": False},
                {"text": "具有2根腳趾", "correct": False},
            ],
        ),
        hard=Diff(
            description='有一種動物，是世界上體型最大的鳥，而且能跑得很快，該動物的名稱是？（請輸入答案）',
            options=[{"text": "大鴕鳥"}],
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
