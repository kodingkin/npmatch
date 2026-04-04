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
