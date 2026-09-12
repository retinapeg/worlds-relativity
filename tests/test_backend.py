from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from backend import app as module

client = TestClient(module.app)
BODY = {"connection_id": "1d688176-174d-49f0-83cb-4b6a168f36d8"}


def test_health_and_protection(monkeypatch):
    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "test-only")
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.post("/api/reactor/token", json=BODY).status_code == 403
    assert client.post("/api/reactor/token", json=BODY,
        headers={"X-Demo-Access": "test-only"}).status_code == 403


def test_scoped_exchange_cached_per_connection(monkeypatch):
    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "test-only")
    module.cache.clear()
    exchange = AsyncMock(return_value={"jwt": "fake-test-token", "expires_at": 9999999999})
    monkeypatch.setattr(module, "exchange_token", exchange)
    headers = {"X-Demo-Access": "test-only", "X-Relativity-Client": "1"}
    first = client.post("/api/reactor/token", json=BODY, headers=headers)
    second = client.post("/api/reactor/token", json=BODY, headers=headers)
    assert first.status_code == 200
    assert first.headers["cache-control"] == "no-store"
    assert second.json() == first.json()
    assert exchange.await_count == 1
    scope = module.TOKEN_REQUEST["authorization_details"][0]
    assert scope["resources"]["models"]["match"] == ["reactor/happy-oyster-director"]
    assert scope["constraints"] == {"max_sessions": 1, "max_session_duration_seconds": 300}
