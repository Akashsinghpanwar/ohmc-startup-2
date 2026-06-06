"""
Neon PostgreSQL connection pool using asyncpg.
statement_cache_size=0 is required for Neon's pgbouncer pooler.
"""
import asyncpg
import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


def _get_dsn() -> str:
    url = os.getenv("DATABASE_URL", "")
    # asyncpg doesn't support channel_binding — remove if present
    url = url.replace("&channel_binding=require", "").replace("?channel_binding=require&", "?")
    # asyncpg uses postgresql:// not postgres://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        dsn = _get_dsn()
        _pool = await asyncpg.create_pool(
            dsn=dsn,
            statement_cache_size=0,   # Required for Neon pgbouncer
            min_size=1,
            max_size=10,
            command_timeout=30,
        )
        logger.info("PostgreSQL pool created (Neon)")
    return _pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL pool closed")


async def execute(query: str, *args):
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)


async def fetch(query: str, *args) -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)
        return [dict(r) for r in rows]


async def fetchrow(query: str, *args) -> dict | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None


async def fetchval(query: str, *args):
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval(query, *args)
