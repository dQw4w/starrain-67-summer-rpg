-- Schema v2: content (bosses/quests) is now hardcoded in backend/content.py
-- DB stores only teams and per-team progress.
--
-- Run this in Supabase SQL Editor (replaces schema.sql).
-- Safe to re-run: uses IF EXISTS / ON CONFLICT guards.

-- ── Drop old content tables (if migrating from v1) ────────────────────────
DROP TABLE IF EXISTS team_quest_progress;
DROP TABLE IF EXISTS team_boss_defeats;
DROP TABLE IF EXISTS quests;
DROP TABLE IF EXISTS bosses;

-- ── Teams ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'normal'
             CHECK (difficulty IN ('easy', 'normal', 'hard'))
);

-- ── Quest progress (quest_id references hardcoded content, no FK) ──────────
CREATE TABLE team_quest_progress (
  team_id      INTEGER NOT NULL REFERENCES teams(id),
  quest_id     INTEGER NOT NULL,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, quest_id)
);

-- ── Boss defeats (boss_id references hardcoded content, no FK) ────────────
CREATE TABLE team_boss_defeats (
  team_id     INTEGER NOT NULL REFERENCES teams(id),
  boss_id     INTEGER NOT NULL,
  defeated    BOOLEAN NOT NULL DEFAULT FALSE,
  defeated_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, boss_id)
);

-- ── Seed: 3 teams ─────────────────────────────────────────────────────────
INSERT INTO teams (id, name, difficulty) VALUES
  (1, '第一探險小隊', 'normal'),
  (2, '第二探險小隊', 'normal'),
  (3, '第三探險小隊', 'normal')
ON CONFLICT (id) DO NOTHING;

-- ── Seed: initial progress rows (quest IDs 1-6, boss IDs 1-2) ─────────────
INSERT INTO team_quest_progress (team_id, quest_id, completed)
SELECT t.id, q.quest_id, FALSE
FROM teams t
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7)) AS q(quest_id)
ON CONFLICT (team_id, quest_id) DO NOTHING;

INSERT INTO team_boss_defeats (team_id, boss_id, defeated)
SELECT t.id, b.boss_id, FALSE
FROM teams t
CROSS JOIN (VALUES (1),(2)) AS b(boss_id)
ON CONFLICT (team_id, boss_id) DO NOTHING;
