import hashlib
import logging
import os
from datetime import UTC, datetime, timedelta

from fastapi import Request

from app.db import get_pool

logger = logging.getLogger(__name__)

SEARCH_EVENT_INSERT = """
INSERT INTO search_events (query, framework, priorities, result_count, ip_hash, user_agent)
VALUES ($1, $2, $3, $4, $5, $6)
"""


def hash_ip(ip: str) -> str:
    """SHA-256 hash of the client IP, salted so it isn't reversible."""
    salt = os.environ.get("ANALYTICS_SALT", "npmatch")
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()


def client_ip(request: Request) -> str:
    """Client IP, honoring X-Forwarded-For (set by the Next.js proxy)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def record_page_view(*, ip_hash: str, user_agent: str | None, referrer: str | None) -> None:
    pool = await get_pool()
    await pool.execute(
        "INSERT INTO page_views (ip_hash, user_agent, referrer) VALUES ($1, $2, $3)",
        ip_hash,
        user_agent,
        referrer,
    )


async def record_search(
    *,
    query: str,
    framework: str | None,
    priorities: list[str] | None,
    result_count: int,
    ip_hash: str,
    user_agent: str | None,
) -> None:
    pool = await get_pool()
    await pool.execute(
        SEARCH_EVENT_INSERT,
        query,
        framework,
        ", ".join(priorities) if priorities else None,
        result_count,
        ip_hash,
        user_agent,
    )


async def get_analytics_summary() -> dict:
    pool = await get_pool()
    cutoff = datetime.now(UTC) - timedelta(hours=24)

    row = await pool.fetchrow(
        """
        SELECT
          (SELECT count(*) FROM page_views) AS total_visits,
          (SELECT count(DISTINCT ip_hash) FROM page_views) AS unique_visitors,
          (SELECT count(*) FROM search_events) AS total_searches,
          (SELECT count(*) FROM page_views WHERE visited_at >= $1) AS visits_last_24h,
          (SELECT count(*) FROM search_events WHERE searched_at >= $1) AS searches_last_24h
        """,
        cutoff,
    )

    top_queries = await pool.fetch(
        """
        SELECT query, count(*) AS count
        FROM search_events
        GROUP BY query
        ORDER BY count DESC, query ASC
        LIMIT 10
        """
    )
    top_frameworks = await pool.fetch(
        """
        SELECT COALESCE(NULLIF(framework, ''), 'any') AS framework, count(*) AS count
        FROM search_events
        GROUP BY COALESCE(NULLIF(framework, ''), 'any')
        ORDER BY count DESC, framework ASC
        LIMIT 10
        """
    )
    top_referrers = await pool.fetch(
        """
        SELECT COALESCE(NULLIF(referrer, ''), '(direct)') AS referrer, count(*) AS count
        FROM page_views
        GROUP BY COALESCE(NULLIF(referrer, ''), '(direct)')
        ORDER BY count DESC, referrer ASC
        LIMIT 10
        """
    )

    return {
        "total_visits": row["total_visits"],
        "unique_visitors": row["unique_visitors"],
        "total_searches": row["total_searches"],
        "visits_last_24h": row["visits_last_24h"],
        "searches_last_24h": row["searches_last_24h"],
        "top_queries": [{"label": r["query"], "count": r["count"]} for r in top_queries],
        "top_frameworks": [{"label": r["framework"], "count": r["count"]} for r in top_frameworks],
        "top_referrers": [{"label": r["referrer"], "count": r["count"]} for r in top_referrers],
    }


async def list_page_views(limit: int = 50) -> list[dict]:
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT visited_at, ip_hash, user_agent, referrer
        FROM page_views
        ORDER BY visited_at DESC
        LIMIT $1
        """,
        limit,
    )
    return [dict(r) for r in rows]


async def list_searches(limit: int = 50) -> list[dict]:
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT searched_at, query, framework, priorities, result_count
        FROM search_events
        ORDER BY searched_at DESC
        LIMIT $1
        """,
        limit,
    )
    out = []
    for row in rows:
        item = dict(row)
        priorities = item["priorities"]
        item["priorities"] = [p.strip() for p in priorities.split(",")] if priorities else None
        out.append(item)
    return out
