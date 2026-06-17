"""Runs idempotent DDL on every startup — no manual SQL scripts ever needed."""
import psycopg2
from loguru import logger
from config import DATABASE_URL
from content import TEAMS

_DDL = """
CREATE TABLE IF NOT EXISTS teams (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'normal'
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

_SEED_TEAM = """
INSERT INTO teams (id, name, difficulty)
VALUES (%(id)s, %(name)s, 'normal')
ON CONFLICT (id) DO NOTHING;
"""


def run_migrations() -> None:
    logger.info("Running startup migrations...")
    # psycopg2 accepts both postgres:// and postgresql://
    url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(_DDL)
            for team_id, name in TEAMS.items():
                cur.execute(_SEED_TEAM, {"id": team_id, "name": name})
        conn.commit()
        logger.info("Migrations complete.")
    except Exception:
        conn.rollback()
        logger.exception("Migration failed")
        raise
    finally:
        conn.close()
