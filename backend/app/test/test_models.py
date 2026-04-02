import pytest
from pydantic import ValidationError

from app.models import SearchRequest, Package, SearchResponse


class TestSearchRequest:

    def test_valid_request(self):
        req = SearchRequest(
            query="react table library",
            framework="react",
            priorities=["small", "typescript"],
        )

        assert req.query == "react table library"
        assert req.framework == "react"
        assert "small" in req.priorities

    def test_query_required(self):
        with pytest.raises(ValidationError):
            SearchRequest()

    def test_query_min_length(self):
        with pytest.raises(ValidationError):
            SearchRequest(query="")

    def test_query_max_length(self):
        with pytest.raises(ValidationError):
            SearchRequest(query="a" * 1001)


class TestPackage:

    def test_valid_package(self):
        pkg = Package(
            name="axios",
            description="HTTP client",
            version="1.0.0",
            npm_url="https://npmjs.com/package/axios",
        )

        assert pkg.name == "axios"
        assert pkg.version == "1.0.0"


class TestSearchResponse:

    def test_response_with_packages(self):
        pkg = Package(
            name="axios",
            description="HTTP client",
            version="1.0.0",
            npm_url="https://npmjs.com/package/axios",
        )

        resp = SearchResponse(packages=[pkg])

        assert len(resp.packages) == 1
        assert resp.packages[0].name == "axios"