import hashlib
import logging
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.analytics import (
    client_ip,
    get_analytics_summary,
    hash_ip,
    list_page_views,
    list_searches,
    record_page_view,
    record_search,
)
from app.main import app


class TestHashIp:
    def test_deterministic(self):
        assert hash_ip("203.0.113.5") == hash_ip("203.0.113.5")

    def test_different_ips_differ(self):
        assert hash_ip("203.0.113.5") != hash_ip("203.0.113.6")

    def test_uses_default_salt(self):
        expected = hashlib.sha256(b"npmatch:203.0.113.5").hexdigest()
        assert hash_ip("203.0.113.5") == expected

    def test_salt_from_env(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_SALT", "custom-salt")
        expected = hashlib.sha256(b"custom-salt:203.0.113.5").hexdigest()
        assert hash_ip("203.0.113.5") == expected


class TestClientIp:
    def test_uses_first_xff_value(self):
        request = MagicMock()
        request.headers = {"x-forwarded-for": "203.0.113.5, 10.0.0.1"}
        assert client_ip(request) == "203.0.113.5"

    def test_falls_back_to_client_host(self):
        request = MagicMock()
        request.headers = {}
        request.client.host = "127.0.0.1"
        assert client_ip(request) == "127.0.0.1"

    def test_unknown_when_no_client(self):
        request = MagicMock()
        request.headers = {}
        request.client = None
        assert client_ip(request) == "unknown"


class TestRecordPageView:
    @pytest.mark.asyncio
    async def test_inserts_row(self):
        pool = MagicMock()
        pool.execute = AsyncMock()

        with patch("app.analytics.get_pool", AsyncMock(return_value=pool)):
            await record_page_view(ip_hash="h", user_agent="ua", referrer="https://example.com")

        pool.execute.assert_awaited_once()
        args = pool.execute.await_args.args
        assert "page_views" in args[0]
        assert args[1:] == ("h", "ua", "https://example.com")


class TestRecordSearch:
    @pytest.mark.asyncio
    async def test_joins_priorities(self):
        pool = MagicMock()
        pool.execute = AsyncMock()

        with patch("app.analytics.get_pool", AsyncMock(return_value=pool)):
            await record_search(
                query="react",
                framework="react",
                priorities=["bundle size", "typescript"],
                result_count=3,
                ip_hash="h",
                user_agent="ua",
            )

        pool.execute.assert_awaited_once()
        args = pool.execute.await_args.args
        assert "search_events" in args[0]
        assert args[1:] == ("react", "react", "bundle size, typescript", 3, "h", "ua")

    @pytest.mark.asyncio
    async def test_none_priorities(self):
        pool = MagicMock()
        pool.execute = AsyncMock()

        with patch("app.analytics.get_pool", AsyncMock(return_value=pool)):
            await record_search(
                query="react",
                framework=None,
                priorities=None,
                result_count=0,
                ip_hash="h",
                user_agent=None,
            )

        args = pool.execute.await_args.args
        assert args[1:] == ("react", None, None, 0, "h", None)


class TestGetAnalyticsSummary:
    @pytest.mark.asyncio
    async def test_returns_structured_summary(self):
        pool = MagicMock()
        pool.fetchrow = AsyncMock(
            return_value={
                "total_visits": 10,
                "unique_visitors": 5,
                "total_searches": 3,
                "visits_last_24h": 2,
                "searches_last_24h": 1,
            }
        )
        pool.fetch = AsyncMock(
            side_effect=[
                [{"query": "react", "count": 4}],
                [{"framework": "react", "count": 3}],
                [{"referrer": "(direct)", "count": 2}],
            ]
        )

        with patch("app.analytics.get_pool", AsyncMock(return_value=pool)):
            summary = await get_analytics_summary()

        assert summary["total_visits"] == 10
        assert summary["unique_visitors"] == 5
        assert summary["searches_last_24h"] == 1
        assert summary["top_queries"] == [{"label": "react", "count": 4}]
        assert summary["top_frameworks"] == [{"label": "react", "count": 3}]
        assert summary["top_referrers"] == [{"label": "(direct)", "count": 2}]


class TestListPageViews:
    @pytest.mark.asyncio
    async def test_returns_dicts(self):
        pool = MagicMock()
        pool.fetch = AsyncMock(
            return_value=[
                {
                    "visited_at": datetime(2026, 8, 11, tzinfo=UTC),
                    "ip_hash": "abc",
                    "user_agent": "ua",
                    "referrer": None,
                }
            ]
        )

        with patch("app.analytics.get_pool", AsyncMock(return_value=pool)):
            result = await list_page_views(limit=5)

        assert result[0]["ip_hash"] == "abc"
        assert result[0]["referrer"] is None


class TestListSearches:
    @pytest.mark.asyncio
    async def test_parses_priorities(self):
        pool = MagicMock()
        pool.fetch = AsyncMock(
            return_value=[
                {
                    "searched_at": datetime(2026, 8, 11, tzinfo=UTC),
                    "query": "react",
                    "framework": "react",
                    "priorities": "bundle size, typescript",
                    "result_count": 3,
                }
            ]
        )

        with patch("app.analytics.get_pool", AsyncMock(return_value=pool)):
            result = await list_searches(limit=5)

        assert result[0]["priorities"] == ["bundle size", "typescript"]

    @pytest.mark.asyncio
    async def test_none_priorities(self):
        pool = MagicMock()
        pool.fetch = AsyncMock(
            return_value=[
                {
                    "searched_at": datetime(2026, 8, 11, tzinfo=UTC),
                    "query": "react",
                    "framework": None,
                    "priorities": None,
                    "result_count": 0,
                }
            ]
        )

        with patch("app.analytics.get_pool", AsyncMock(return_value=pool)):
            result = await list_searches(limit=5)

        assert result[0]["priorities"] is None


class TestAnalyticsEndpoints:
    def test_summary_requires_token(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        with TestClient(app) as client:
            res = client.get("/api/analytics/summary")
        assert res.status_code == 401

    def test_summary_rejects_wrong_token(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        with TestClient(app) as client:
            res = client.get("/api/analytics/summary", headers={"x-analytics-token": "wrong"})
        assert res.status_code == 401

    def test_summary_with_token(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        mock_summary = {
            "total_visits": 10,
            "unique_visitors": 5,
            "total_searches": 3,
            "visits_last_24h": 2,
            "searches_last_24h": 1,
            "top_queries": [],
            "top_frameworks": [],
            "top_referrers": [],
        }
        with (
            patch("app.main.get_analytics_summary", AsyncMock(return_value=mock_summary)),
            TestClient(app) as client,
        ):
            res = client.get("/api/analytics/summary", headers={"x-analytics-token": "secret"})
        assert res.status_code == 200
        assert res.json()["total_visits"] == 10

    def test_visits_requires_token(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        with TestClient(app) as client:
            res = client.get("/api/analytics/visits")
        assert res.status_code == 401

    def test_searches_requires_token(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        with TestClient(app) as client:
            res = client.get("/api/analytics/searches")
        assert res.status_code == 401

    def test_summary_502_on_db_error_logs_traceback(self, monkeypatch, caplog):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        with (
            patch(
                "app.main.get_analytics_summary",
                AsyncMock(side_effect=RuntimeError("db down")),
            ),
            TestClient(app) as client,
            caplog.at_level(logging.ERROR),
        ):
            res = client.get(
                "/api/analytics/summary", headers={"x-analytics-token": "secret"}
            )
        assert res.status_code == 502
        assert res.json() == {"detail": "Analytics query failed"}
        assert any(
            "Analytics summary failed" in r.message and r.exc_info for r in caplog.records
        )

    def test_visits_502_on_db_error(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        with (
            patch(
                "app.main.list_page_views",
                AsyncMock(side_effect=RuntimeError("db down")),
            ),
            TestClient(app) as client,
        ):
            res = client.get(
                "/api/analytics/visits", headers={"x-analytics-token": "secret"}
            )
        assert res.status_code == 502
        assert res.json() == {"detail": "Analytics query failed"}

    def test_searches_502_on_db_error(self, monkeypatch):
        monkeypatch.setenv("ANALYTICS_TOKEN", "secret")
        with (
            patch(
                "app.main.list_searches",
                AsyncMock(side_effect=RuntimeError("db down")),
            ),
            TestClient(app) as client,
        ):
            res = client.get(
                "/api/analytics/searches", headers={"x-analytics-token": "secret"}
            )
        assert res.status_code == 502
        assert res.json() == {"detail": "Analytics query failed"}
