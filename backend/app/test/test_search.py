import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.search import package_search


@pytest.mark.asyncio
async def test_vector_search_skips_missing_metadata():
    hit = MagicMock()
    hit.payload = {"name": "missing"}

    qdrant = MagicMock()
    qdrant.query_points = AsyncMock(return_value=MagicMock(points=[hit]))

    mock_pool = MagicMock()
    mock_pool.fetch = AsyncMock(return_value=[])

    with (
        patch("app.search.get_qdrant_client", return_value=qdrant),
        patch("app.search._get_pool", AsyncMock(return_value=mock_pool)),
        patch("app.search._fts_search", AsyncMock(return_value=[])),
        patch("app.search._embed_query", AsyncMock(return_value=[0.1])),
    ):
        result = await package_search("missing")

    assert result == []


@pytest.mark.asyncio
async def test_hybrid_fusion_vector_and_fts():
    hit = MagicMock()
    hit.payload = {"name": "axios"}

    qdrant = MagicMock()
    qdrant.query_points = AsyncMock(return_value=MagicMock(points=[hit]))

    fts_results = ["react"]

    rows = [
        {
            "name": "axios",
            "description": "http client",
            "keywords": ["http"],
            "version": "1.0.0",
        },
        {
            "name": "react",
            "description": "ui lib",
            "keywords": ["ui"],
            "version": "18.0.0",
        },
    ]

    mock_pool = MagicMock()
    mock_pool.fetch = AsyncMock(return_value=rows)

    with (
        patch("app.search.get_qdrant_client", return_value=qdrant),
        patch("app.search._get_pool", AsyncMock(return_value=mock_pool)),
        patch("app.search._fts_search", AsyncMock(return_value=fts_results)),
        patch("app.search._embed_query", AsyncMock(return_value=[0.1, 0.2])),
    ):
        result = await package_search("frontend")

    assert len(result) == 2
    names = {r["name"] for r in result}
    assert names == {"axios", "react"}


@pytest.mark.asyncio
async def test_rrf_ordering_prefers_shared_results():
    hit = MagicMock()
    hit.payload = {"name": "axios"}

    qdrant = MagicMock()
    qdrant.query_points = AsyncMock(
        return_value=MagicMock(points=[hit, MagicMock(payload={"name": "lodash"})])
    )

    fts_results = ["axios", "react"]

    rows = [
        {"name": "axios", "description": "", "keywords": [], "version": "1"},
        {"name": "lodash", "description": "", "keywords": [], "version": "1"},
        {"name": "react", "description": "", "keywords": [], "version": "1"},
    ]

    mock_pool = MagicMock()
    mock_pool.fetch = AsyncMock(return_value=rows)

    with (
        patch("app.search.get_qdrant_client", return_value=qdrant),
        patch("app.search._get_pool", AsyncMock(return_value=mock_pool)),
        patch("app.search._fts_search", AsyncMock(return_value=fts_results)),
        patch("app.search._embed_query", AsyncMock(return_value=[0.1])),
    ):
        result = await package_search("test")

    assert result[0]["name"] == "axios"
