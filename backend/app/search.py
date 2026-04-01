import os
from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
import asyncpg

openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

qdrant_client = AsyncQdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ.get("QDRANT_API_KEY") or None,
)

COLLECTION_NAME = "npmatch"

_pg_pool: asyncpg.Pool | None = None

async def _get_pool() -> asyncpg.Pool:
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = await asyncpg.create_pool(
            dsn=os.environ["DATABASE_URL"],
            min_size=1,
            max_size=5,
        )
    return _pg_pool


async def embed_query(text: str) -> list[float]:
    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def vector_search(embedding: list[float], top_k: int = 5) -> list[dict]:
    response = await qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=embedding,
        limit=top_k,
        with_payload=True,
    )

    results = response.points

    if not results:
        return []

    names = [hit.payload["name"] for hit in results]

    pool = await _get_pool()
    rows = await pool.fetch(
        "SELECT name, description, keywords, version FROM packages WHERE name = ANY($1)",
        names,
    )
    meta_by_name = {row["name"]: row for row in rows}

    packages = []
    for hit in results:
        name = hit.payload["name"]
        meta = meta_by_name.get(name)
        if not meta:
            continue
        packages.append({
            "name": name,
            "description": meta["description"] or "",
            "version": meta["version"] or "",
            "keywords": meta["keywords"] or "",
            "npm_url": f"https://www.npmjs.com/package/{name}",
            "score": hit.score,
        })

    return packages