-- 在 Supabase SQL Editor 執行此檔案以更新動物園題目

-- 1. 擴充 type 欄位允許 fill_in
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_type_check;
ALTER TABLE quests ADD CONSTRAINT quests_type_check
  CHECK (type IN ('multiple_choice', 'task', 'fill_in'));

-- 2. 更新知識題（Quest 1）→ 大鴕鳥
UPDATE quests SET
  name             = '大鴕鳥知識王',
  emoji            = '🦤',
  type             = 'fill_in',
  description_easy = '大鴕鳥的速度最快可達多少？',
  options_easy     = '[
    {"text":"30 km/h","correct":false},
    {"text":"60 km/h","correct":true},
    {"text":"90 km/h","correct":false},
    {"text":"120 km/h","correct":false}
  ]'::jsonb,
  description_normal = '下列何者不是大鴕鳥的特徵？',
  options_normal     = '[
    {"text":"體重可達150公斤","correct":false},
    {"text":"最快跑步速度為30 km/h","correct":true},
    {"text":"雄性羽毛為黑色或白色","correct":false},
    {"text":"具有2根腳趾","correct":false}
  ]'::jsonb,
  description_hard = '有一種動物，是世界上體型最大的鳥，而且能跑得很快，該動物的名稱是？（請輸入答案）',
  options_hard     = '[{"text":"大鴕鳥","correct":true}]'::jsonb
WHERE id = 1;

-- 3. 更新拍照題（Quest 2）→ 靈長目
UPDATE quests SET
  name             = '靈長目大集合',
  emoji            = '🐒',
  type             = 'task',
  description_easy   = '在動物園找到 1 種靈長目動物（猴子、猩猩等），全隊一起跟牠拍照，拍好後給關主看！',
  options_easy       = NULL,
  description_normal = '在動物園找到 2 種不同的靈長目動物，全隊分別跟每種合照，全部拍好後給關主看！',
  options_normal     = NULL,
  description_hard   = '在動物園找到 3 種不同的靈長目動物，全隊分別跟每種合照，全部拍好後給關主看！',
  options_hard       = NULL
WHERE id = 2;
