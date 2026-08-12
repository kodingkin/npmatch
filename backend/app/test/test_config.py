import os
from urllib.parse import urlparse

import pytest

import app.env  # noqa: F401  (loads backend/.env via python-dotenv)


def test_db_connection_string_uses_supabase_session_pooler():
    """Config guard: cloud DB must use the Supabase session pooler (5432).

    Port 6543 is the transaction pooler, which does not track asyncpg's named
    prepared statements across connection reassignment and intermittently raises
    DuplicatePreparedStatementError -> 502. See doc/analytics-dashboard-blocker.md.
    """
    db = os.environ.get("DATABASE_CONNECTION_STRING", "")
    if not db:
        pytest.skip("DATABASE_CONNECTION_STRING not set (CI or offline dev)")
    if "pooler.supabase.com" not in db:
        pytest.skip("not running against the Supabase pooler (local docker)")

    port = urlparse(db).port
    assert port == 5432, (
        f"Supabase pooler port is {port}; expected 5432 (session pooler). "
        "Port 6543 (transaction pooler) breaks asyncpg named prepared statements."
    )
