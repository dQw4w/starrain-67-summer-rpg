-- 改成只有兩個手下：米怪（Boss 1）、粉怪（Boss 2）

-- 1. 更新 Boss 1 → 米怪
UPDATE bosses SET
  name          = '米怪',
  emoji         = '⭐',
  location_name = '新竹市立動物園',
  location_hint = '動物園入口旁的大榕樹下，尋找印有爪印的神秘箱子',
  order_index   = 1
WHERE id = 1;

-- 2. 更新 Boss 2 → 粉怪
UPDATE bosses SET
  name          = '粉怪',
  emoji         = '🌸',
  location_name = '玻璃工藝博物館',
  location_hint = '博物館正門廣場噴水池旁，玻璃球裝置藝術附近',
  order_index   = 2
WHERE id = 2;

-- 3. 將 Boss 3（文廟智者）的任務合併到 Boss 2（粉怪）
UPDATE quests SET boss_id = 2 WHERE boss_id = 3;

-- 4. 刪除 Boss 3 的進度紀錄與 Boss 3 本身
DELETE FROM team_boss_defeats WHERE boss_id = 3;
DELETE FROM bosses WHERE id = 3;

-- 5. 補上新合併進 Boss 2 的任務進度（所有隊伍）
INSERT INTO team_quest_progress (team_id, quest_id, completed)
SELECT t.id, q.id, FALSE
FROM teams t CROSS JOIN quests q
WHERE q.boss_id = 2
ON CONFLICT (team_id, quest_id) DO NOTHING;
