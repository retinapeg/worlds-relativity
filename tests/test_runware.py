import asyncio
import base64
import json
import struct
import zlib
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend import runware

app = FastAPI()
app.include_router(runware.router)
client = TestClient(app)
HEADERS = {"X-Demo-Access": "test-only", "X-Relativity-Client": "1"}
def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
PNG = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1024, 576, 8, 2, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress((b"\0" + b"\x10\x20\x40" * 1024) * 576)) + chunk(b"IEND", b""))


@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "test-only")
    monkeypatch.setenv("WORLD_ASSET_CACHE", str(tmp_path))
    monkeypatch.delenv("WORLD_ASSET_VOLUME", raising=False)
    monkeypatch.setenv("RUNWARE_GENERATION_ALLOWANCE", "0")
    monkeypatch.delenv("RUNWARE_API_KEY", raising=False)
    monkeypatch.setattr(runware, "lock", asyncio.Lock())


def test_closed_by_default_and_protected(monkeypatch):
    post = AsyncMock()
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    assert client.get("/api/runware/status").status_code == 403
    assert client.post("/api/runware/frame", headers={"X-Demo-Access": "test-only"}).status_code == 403
    assert client.get("/api/runware/status", headers=HEADERS).json()["can_generate"] is False
    assert client.post("/api/runware/frame", headers=HEADERS).status_code == 409
    monkeypatch.setenv("RUNWARE_API_KEY", "fake-test-key")
    assert client.post("/api/runware/frame", headers=HEADERS).status_code == 409
    post.assert_not_called()


def test_one_generation_cached_and_reused(monkeypatch):
    monkeypatch.setenv("RUNWARE_API_KEY", "fake-test-key")
    monkeypatch.setenv("RUNWARE_GENERATION_ALLOWANCE", "1")
    async def provider(url, *, json, headers):
        assert url == "https://api.runware.ai/v1"
        assert len(json) == 1 and json[0]["numberResults"] == 1
        assert json[0]["model"] == "runware:101@1"
        return httpx.Response(200, json={"data": [{"taskUUID": json[0]["taskUUID"],
            "imageBase64Data": base64.b64encode(PNG).decode(), "cost": 0.01}]})
    post = AsyncMock(side_effect=provider)
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    for _ in range(2):
        response = client.post("/api/runware/frame", headers=HEADERS)
        assert response.status_code == 200
        assert response.json()["ready"] and not response.json()["can_generate"]
        assert response.json()["cost_usd"] == 0.01
        assert "fake-test-key" not in response.text
    assert client.get("/api/runware/frame", headers=HEADERS).content == PNG
    assert post.await_count == 1


def test_uncertain_provider_failure_does_not_retry(monkeypatch):
    monkeypatch.setenv("RUNWARE_API_KEY", "fake-test-key")
    monkeypatch.setenv("RUNWARE_GENERATION_ALLOWANCE", "1")
    post = AsyncMock(side_effect=httpx.ReadTimeout("secret provider details"))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    first = client.post("/api/runware/frame", headers=HEADERS)
    assert first.status_code == 502 and "secret provider details" not in first.text
    assert client.post("/api/runware/frame", headers=HEADERS).status_code == 409
    assert post.await_count == 1
    marker = json.loads((runware.cache_dir() / "attempted").read_text())
    assert marker["task_uuid"] == post.call_args.kwargs["json"][0]["taskUUID"]


@pytest.mark.parametrize("change", ["id", "format", "dimensions", "cost", "missing", "truncated", "corrupt"])
def test_reject_invalid_provider_artwork(change):
    row = {"taskUUID": "expected", "imageBase64Data": base64.b64encode(PNG).decode(), "cost": 0.01}
    if change == "id": row["taskUUID"] = "different"
    if change == "format": row["imageBase64Data"] = base64.b64encode(b"<script>bad</script>" * 2).decode()
    if change == "dimensions": row["imageBase64Data"] = base64.b64encode(PNG[:16] + struct.pack(">II", 99999, 576)).decode()
    if change == "cost": row["cost"] = float("nan")
    if change == "missing": del row["imageBase64Data"]
    if change == "truncated": row["imageBase64Data"] = base64.b64encode(PNG[:24]).decode()
    if change == "corrupt": row["imageBase64Data"] = base64.b64encode(PNG[:-1] + bytes([PNG[-1] ^ 1])).decode()
    with pytest.raises(ValueError):
        runware.decode_frame({"data": [row]}, "expected")
