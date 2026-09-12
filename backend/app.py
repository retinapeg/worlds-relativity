"""One protected token exchange. Provider secrets never reach the browser."""
import asyncio
import hmac
import os
import time
from pathlib import Path
from uuid import UUID

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel
from backend.runware import router as artwork_router

load_dotenv(Path(__file__).resolve().parents[1] / ".env.server", override=False)
MODEL = "reactor/happy-oyster-director"
TOKEN_REQUEST = {
    "expires_after": 900,
    "authorization_details": [{
        "type": "session",
        "resources": {"models": {"match": [MODEL]}},
        "constraints": {"max_sessions": 1, "max_session_duration_seconds": 300},
    }],
}
app = FastAPI(title="Relativity local bridge", docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(artwork_router)
cache: dict = {}
lock = asyncio.Lock()


class TokenRequest(BaseModel):
    connection_id: UUID


@app.get("/api/health")
def health():
    return {"status": "ok", "model": MODEL, "reactor_configured": bool(os.getenv("REACTOR_API_KEY")),
            "hosting": "modal" if os.getenv("WORLD_ASSET_VOLUME") else "local",
            "runware_configured": bool(os.getenv("RUNWARE_API_KEY"))}


async def exchange_token():
    key = os.getenv("REACTOR_API_KEY", "")
    if not key:
        raise HTTPException(503, "Reactor key is missing from the server environment.")
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            result = await client.post("https://api.reactor.inc/tokens",
                headers={"Reactor-API-Key": key}, json=TOKEN_REQUEST)
    except httpx.HTTPError as error:
        # Do not log request headers, response bodies or JWTs.
        raise HTTPException(502, f"Reactor transport failed ({type(error).__name__}).") from None
    if result.status_code != 200:
        messages = {401: "Primary Reactor key was rejected (HTTP 401).",
                    403: "Reactor denied this model or token scope (HTTP 403).",
                    402: "Reactor requires account credit (HTTP 402).",
                    429: "Reactor rate or capacity limit (HTTP 429)."}
        raise HTTPException(502, messages.get(result.status_code,
            f"Reactor token exchange failed (HTTP {result.status_code})."))
    try:
        payload = result.json()
        jwt, expires = payload["jwt"], float(payload["expires_at"])
        if not isinstance(jwt, str) or not jwt or expires < time.time() + 300:
            raise ValueError()
    except (KeyError, ValueError, TypeError):
        raise HTTPException(502, "Reactor returned an invalid or too-short token lifetime.") from None
    return {"jwt": jwt, "expires_at": expires}


@app.post("/api/reactor/token")
async def token(body: TokenRequest, response: Response,
                x_demo_access: str = Header(default=""),
                x_relativity_client: str = Header(default="")):
    response.headers["Cache-Control"] = "no-store"
    secret = os.getenv("DEMO_ACCESS_TOKEN", "")
    if not secret or not hmac.compare_digest(x_demo_access, secret) or x_relativity_client != "1":
        raise HTTPException(403, "Token endpoint requires the protected local application bridge.")
    identity = str(body.connection_id)
    # Coalesce repeated SDK actions, preserving the JWT bound to this session.
    async with lock:
        now = time.time()
        for key in list(cache):
            if cache[key]["expires_at"] <= now:
                del cache[key]
        if identity in cache:
            return cache[identity]
        if len(cache) >= 32:
            raise HTTPException(429, "Too many recent connections; allow existing tokens to expire.")
        cache[identity] = await exchange_token()
        return cache[identity]
