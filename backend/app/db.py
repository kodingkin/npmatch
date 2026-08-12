import os

import asyncpg

_pg_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Lazy initialization of the shared asyncpg pool."""
    global _pg_pool

    if _pg_pool is None:
        _pg_pool = await asyncpg.create_pool(
            dsn=os.environ["DATABASE_CONNECTION_STRING"],
            min_size=1,
            max_size=5,
        )

    return _pg_pool
