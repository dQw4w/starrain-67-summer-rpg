from functools import lru_cache
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY


@lru_cache(maxsize=1)
def get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)
