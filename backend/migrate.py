"""Runs idempotent DDL via Supabase Management API on every startup.

Uses HTTPS (api.supabase.com) — no direct Postgres connection needed,
works from any host (Render, Railway, local, etc.).
"""
import re
import httpx
from loguru import logger
from config import SUPABASE_URL, SUPABASE_ACCESS_TOKEN
from content import TEAMS

_PROJECT_REF = re.match(r"https://([^.]+)\.supabase\.co", SUPABASE_URL).group(1)
_SQL_ENDPOINT = f"https://api.supabase.com/v1/projects/{_PROJECT_REF}/database/query"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS teams (
    id         INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    difficulty TEXT    NOT NULL DEFAULT 'normal'
               CHECK (difficulty IN ('easy', 'normal', 'hard'))
);

CREATE TABLE IF NOT EXISTS team_quest_progress (
    team_id      INTEGER NOT NULL REFERENCES teams(id),
    quest_id     INTEGER NOT NULL,
    completed    BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (team_id, quest_id)
);

CREATE TABLE IF NOT EXISTS team_boss_defeats (
    team_id     INTEGER NOT NULL REFERENCES teams(id),
    boss_id     INTEGER NOT NULL,
    defeated    BOOLEAN NOT NULL DEFAULT FALSE,
    defeated_at TIMESTAMPTZ,
    PRIMARY KEY (team_id, boss_id)
);
"""


def _exec(sql: str) -> None:
    r = httpx.post(
        _SQL_ENDPOINT,
        headers={
            "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=30,
    )
    if not r.is_success:
        raise RuntimeError(f"Migration API error {r.status_code}: {r.text}")


def run_migrations() -> None:
    logger.info(f"Running migrations (project={_PROJECT_REF})...")
    _exec(_SCHEMA)
    seed = "; ".join(
        f"INSERT INTO teams (id, name, difficulty) VALUES ({tid}, $${name}$$, 'normal') ON CONFLICT (id) DO NOTHING"
        for tid, name in TEAMS.items()
    ) + ";"
    _exec(seed)
    logger.info("Migrations complete.")
