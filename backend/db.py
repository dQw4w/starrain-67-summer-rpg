from functools import lru_cache
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
from loguru import logger

@lru_cache(maxsize=1)
def get_client() -> Client:
    logger.info(f"Creating Supabase client with URL: {SUPABASE_URL}" )
    return create_client(SUPABASE_URL, SUPABASE_KEY)
