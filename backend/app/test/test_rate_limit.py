from fastapi import Request

from app.main import rate_limit_key


def test_rate_limit_key_uses_leftmost_forwarded_ip():
    scope = {
        "type": "http",
        "headers": [(b"x-forwarded-for", b"1.2.3.4, 10.0.0.1")],
    }
    assert rate_limit_key(Request(scope)) == "1.2.3.4"


def test_rate_limit_key_falls_back_to_client_host():
    scope = {
        "type": "http",
        "headers": [],
        "client": ("127.0.0.1", 54321),
    }
    assert rate_limit_key(Request(scope)) == "127.0.0.1"


def test_rate_limit_key_unknown_when_no_peer():
    scope = {"type": "http", "headers": []}
    assert rate_limit_key(Request(scope)) == "unknown"
