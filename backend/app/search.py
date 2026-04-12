import os
import asyncio
from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
import asyncpg
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_openai_client() -> AsyncOpenAI:
    """Lazy initialization of OpenAI client."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        api_key = "test-key"
    return AsyncOpenAI(api_key=api_key)


_qdrant_client: AsyncQdrantClient | None = None


def get_qdrant_client() -> AsyncQdrantClient:
    """Lazy initialization of Qdrant client."""
    global _qdrant_client

    if _qdrant_client is None:
        url = os.environ.get("QDRANT_URL", "http://localhost:6333")
        api_key = os.environ.get("QDRANT_CLOUD_API_KEY") or None

        _qdrant_client = AsyncQdrantClient(
            url=url,
            api_key=api_key,
        )

    return _qdrant_client


COLLECTION_NAME = "npmatch"
CANDIDATE_LIMIT = 20

_pg_pool: asyncpg.Pool | None = None


async def _get_pool() -> asyncpg.Pool:
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = await asyncpg.create_pool(
            dsn=os.environ["DATABASE_CONNECTION_STRING"],
            min_size=1,
            max_size=5,
        )
    return _pg_pool


def _rrf(rankings: list[list[str]], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, name in enumerate(ranking, start=1):
            scores[name] = scores.get(name, 0) + 1 / (k + rank)
    return sorted(scores, key=lambda n: scores[n], reverse=True)


async def _embed_query(text: str) -> list[float]:
    openai_client = get_openai_client()
    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def _vector_search(embedding: list[float]) -> list[str]:
    qdrant_client = get_qdrant_client()
    response = await qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=embedding,
        limit=CANDIDATE_LIMIT,
        with_payload=True,
    )

    results = response.points

    if not results:
        return []

    return [hit.payload["name"] for hit in results]


async def _fts_search(query: str) -> list[str]:
    pool = await _get_pool()
    rows = await pool.fetch(
        """
        SELECT name,
               ts_rank_cd(search_vector, q) AS rank
        FROM packages,
             websearch_to_tsquery('english', $1) AS q
        WHERE search_vector @@ q
        ORDER BY rank DESC, name ASC
        LIMIT $2
        """,
        query,
        CANDIDATE_LIMIT,
    )
    return [row["name"] for row in rows]


def _rrf(rankings: list[list[str]], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, name in enumerate(ranking, start=1):
            scores[name] = scores.get(name, 0) + 1 / (k + rank)
    return sorted(scores, key=lambda n: scores[n], reverse=True)


async def _fetch_metadata(names: list[str]) -> list[dict]:
    pool = await _get_pool()
    rows = await pool.fetch(
        "SELECT name, description, keywords, version FROM packages WHERE name = ANY($1)",
        names,
    )
    return [dict(row) for row in rows]


async def package_search(query: str, top_k: int = 6) -> list[dict]:
    """
    Hybrid search entry point — the only export.

    FTS runs concurrently with embedding + vector search since it only needs
    the raw query text. This hides the OpenAI embedding latency behind the
    Postgres query.

    1. Concurrently:
       - embed query → Qdrant vector search  (dense)
       - Postgres FTS keyword search          (sparse)
    2. Fuse both ranked name lists with RRF
    3. Fetch full metadata for top_k results in one Postgres query
    """

    async def _dense(q: str) -> list[str]:
        embedding = await _embed_query(q)
        return await _vector_search(embedding)

    vector_names, fts_names = await asyncio.gather(
        _dense(query),
        _fts_search(query),
    )

    logger.info(f"List from vector search: {vector_names}")
    logger.info(f"List from fts search: {fts_names}")

    fused_names = _rrf([vector_names, fts_names])
    top_names = fused_names[:top_k]

    if not top_names:
        return []

    rows = await _fetch_metadata(top_names)
    meta_by_name = {row["name"]: row for row in rows}

    packages = []
    for name in top_names:
        meta = meta_by_name.get(name)
        if not meta:
            continue
        packages.append(
            {
                "name": name,
                "description": meta["description"] or "",
                "version": meta["version"] or "",
                "keywords": meta["keywords"] or "",
                "npm_url": f"https://www.npmjs.com/package/{name}",
            }
        )

    return packages
