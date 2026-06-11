-- 好棒鴨探險隊 RPG Schema
-- Run this in Supabase SQL editor to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Static game content ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bosses (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '👾',
  location_name TEXT NOT NULL,
  location_hint TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quests (
  id               SERIAL PRIMARY KEY,
  boss_id          INTEGER NOT NULL REFERENCES bosses(id),
  name             TEXT NOT NULL,
  emoji            TEXT NOT NULL DEFAULT '📋',
  type             TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (type IN ('multiple_choice', 'task')),
  -- easy difficulty
  description_easy TEXT NOT NULL,
  options_easy     JSONB,   -- [{text, correct}] for multiple_choice
  -- normal difficulty
  description_normal TEXT NOT NULL,
  options_normal   JSONB,
  -- hard difficulty
  description_hard TEXT NOT NULL,
  options_hard     JSONB,
  order_index      INTEGER NOT NULL DEFAULT 0
);

-- ─── Per-team state ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard'))
);

CREATE TABLE IF NOT EXISTS team_quest_progress (
  team_id      INTEGER NOT NULL REFERENCES teams(id),
  quest_id     INTEGER NOT NULL REFERENCES quests(id),
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, quest_id)
);

CREATE TABLE IF NOT EXISTS team_boss_defeats (
  team_id     INTEGER NOT NULL REFERENCES teams(id),
  boss_id     INTEGER NOT NULL REFERENCES bosses(id),
  defeated    BOOLEAN NOT NULL DEFAULT FALSE,
  defeated_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, boss_id)
);

-- ─── Seed: teams ────────────────────────────────────────────────────────────

INSERT INTO teams (id, name, difficulty) VALUES
  (1, '第一探險小隊', 'normal'),
  (2, '第二探險小隊', 'normal'),
  (3, '第三探險小隊', 'normal')
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: bosses ────────────────────────────────────────────────────────────

INSERT INTO bosses (id, name, emoji, location_name, location_hint, order_index) VALUES
  (1, '動物王', '🦁', '新竹市立動物園', '動物園入口旁的大榕樹下，尋找印有爪印的神秘箱子', 1),
  (2, '玻璃守衛', '💎', '玻璃工藝博物館', '博物館正門廣場噴水池旁，玻璃球裝置藝術附近', 2),
  (3, '文廟智者', '🦉', '新竹孔廟', '大成殿前石階中央，尋找寫有「智」字的石碑', 3)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: quests ────────────────────────────────────────────────────────────

INSERT INTO quests (id, boss_id, name, emoji, type, description_easy, options_easy, description_normal, options_normal, description_hard, options_hard, order_index) VALUES

-- Boss 1 quests (動物園)
(1, 1, '動物知識王', '🐾', 'multiple_choice',
  '長頸鹿是世界上最高的動物，這是真的嗎？',
  '[{"text":"是真的！","correct":true},{"text":"不是，大象最高","correct":false}]',
  '長頸鹿的脖子有幾節骨頭？',
  '[{"text":"1節","correct":false},{"text":"7節","correct":true},{"text":"15節","correct":false},{"text":"20節","correct":false}]',
  '在動物園中找到3種來自非洲的動物，並各說出一個牠們的特別之處。',
  NULL,
  1
),
(2, 1, '動物觀察家', '🔭', 'task',
  '找到一隻你喜歡的動物，告訴隊長牠的顏色是什麼。',
  NULL,
  '找到企鵝區，數一數今天看得到幾隻企鵝，告訴隊長答案。',
  NULL,
  '找到3種不同的動物，每種說出1個關於牠的有趣冷知識。',
  NULL,
  2
),

-- Boss 2 quests (玻璃博物館)
(3, 2, '玻璃小達人', '✨', 'multiple_choice',
  '玻璃是透明的，這是真的嗎？',
  '[{"text":"是真的！","correct":true},{"text":"玻璃是不透明的","correct":false}]',
  '玻璃主要是用什麼原料製作的？',
  '[{"text":"沙子","correct":true},{"text":"石頭","correct":false},{"text":"水","correct":false},{"text":"木頭","correct":false}]',
  '在博物館中找到3種不同種類的玻璃工藝品，分別描述它們的製作技法或特色。',
  NULL,
  1
),
(4, 2, '創意設計師', '🎨', 'task',
  '在博物館中找到你覺得最漂亮的玻璃作品，告訴大家你喜歡它哪裡。',
  NULL,
  '用紙筆畫下（或口頭描述）你最喜歡的一件玻璃藝品，說明它的形狀和顏色。',
  NULL,
  '設計一個你自己的玻璃藝品：說明它的形狀、顏色、用途，以及為什麼你想做這個。',
  NULL,
  2
),

-- Boss 3 quests (孔廟)
(5, 3, '孔廟小學者', '📚', 'multiple_choice',
  '孔子是一位很有名的老師，這是真的嗎？',
  '[{"text":"是真的！","correct":true},{"text":"他是一位廚師","correct":false}]',
  '孔子教我們要用什麼態度對待長輩？',
  '[{"text":"尊敬","correct":true},{"text":"忽視","correct":false},{"text":"嘲笑","correct":false},{"text":"命令","correct":false}]',
  '孔廟裡有哪些主要建築？找到至少3棟並說明每棟的名稱和功能。',
  NULL,
  1
),
(6, 3, '孔廟探險家', '🗺️', 'task',
  '在孔廟找到「大成殿」的牌匾，告訴隊長你找到了。',
  NULL,
  '找到孔廟裡的石碑，念出上面你看得懂的一個字，並說說它是什麼意思。',
  NULL,
  '找到孔廟的5種不同裝飾元素（龍、鳳、花紋等），說明每個裝飾出現在哪裡、代表什麼意義。',
  NULL,
  2
)
ON CONFLICT (id) DO NOTHING;

-- ─── Initialize quest progress for all teams ─────────────────────────────────

INSERT INTO team_quest_progress (team_id, quest_id, completed)
SELECT t.id, q.id, FALSE
FROM teams t CROSS JOIN quests q
ON CONFLICT (team_id, quest_id) DO NOTHING;

INSERT INTO team_boss_defeats (team_id, boss_id, defeated)
SELECT t.id, b.id, FALSE
FROM teams t CROSS JOIN bosses b
ON CONFLICT (team_id, boss_id) DO NOTHING;
