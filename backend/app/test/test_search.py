import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.search import embed_query, vector_search


@pytest.mark.asyncio
async def test_embed_query():
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1, 0.2, 0.3])]

    mock_openai = MagicMock()
    mock_openai.embeddings.create = AsyncMock(return_value=mock_response)

    with patch("app.search.get_openai_client", return_value=mock_openai):
        result = await embed_query("hello")

    assert result == [0.1, 0.2, 0.3]


@pytest.mark.asyncio
async def test_vector_search_basic():
    # mock qdrant hit
    hit = MagicMock()
    hit.payload = {"name": "axios"}
    hit.score = 0.9

    qdrant = MagicMock()
    qdrant.query_points = AsyncMock(return_value=MagicMock(points=[hit]))

    # mock postgres
    row = {
        "name": "axios",
        "description": "http client",
        "keywords": ["http"],
        "version": "1.0.0",
    }

    mock_pool = MagicMock()
    mock_pool.fetch = AsyncMock(return_value=[row])

    with patch("app.search.get_qdrant_client", return_value=qdrant), \
         patch("app.search._get_pool", AsyncMock(return_value=mock_pool)):

        result = await vector_search([0.1, 0.2])

    assert len(result) == 1
    assert result[0]["name"] == "axios"
    assert result[0]["version"] == "1.0.0"
    assert "npmjs.com" in result[0]["npm_url"]


@pytest.mark.asyncio
async def test_vector_search_no_results():
    qdrant = MagicMock()
    qdrant.query_points = AsyncMock(return_value=MagicMock(points=[]))

    with patch("app.search.get_qdrant_client", return_value=qdrant):
        result = await vector_search([0.1, 0.2])

    assert result == []


@pytest.mark.asyncio
async def test_vector_search_skips_missing_metadata():
    hit = MagicMock()
    hit.payload = {"name": "missing"}
    hit.score = 0.5

    qdrant = MagicMock()
    qdrant.query_points = AsyncMock(return_value=MagicMock(points=[hit]))

    mock_pool = MagicMock()
    mock_pool.fetch = AsyncMock(return_value=[])

    with patch("app.search.get_qdrant_client", return_value=qdrant), \
         patch("app.search._get_pool", AsyncMock(return_value=mock_pool)):

        result = await vector_search([0.1])

    assert result == []
    