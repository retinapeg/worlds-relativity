"""One opt-in Runware starting frame, cached for Reactor. No browser provider key."""
import asyncio
import base64
import binascii
import hashlib
import json
import math
import os
import struct
import zlib
from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import APIRouter, Header, HTTPException, Response

router = APIRouter(prefix="/api/runware")
lock = asyncio.Lock()
MODEL = "runware:101@1"
PROMPT = (
    "Cinematic first-person futuristic spacecraft cockpit approaching a colossal "
    "illuminated orbital gate, concentric cyan and amber polygon rings receding "
    "toward a distant vanishing point. Nearby intricate geometric trusses frame "
    "the view with strong forward depth and parallax cues. Dark space, delicate "
    "violet nebula, fine stars, elegant cockpit edges, photorealistic film lighting, "
    "crisp geometry, no people, no text, no letters, no HUD or interface overlays. "
    "Wide landscape composition, balanced exposure, no motion blur."
)
MAX_IMAGE = 2_000_000


def cache_dir():
    return Path(os.getenv("WORLD_ASSET_CACHE", "build/world-assets"))


def authorized(access, client):
    import hmac
    expected = os.getenv("DEMO_ACCESS_TOKEN", "")
    if not expected or not hmac.compare_digest(access, expected) or client != "1":
        raise HTTPException(403, "Artwork requires the protected application bridge.")


def status():
    root = cache_dir()
    ready = (root / "frame.png").is_file() and (root / "frame.json").is_file()
    configured = bool(os.getenv("RUNWARE_API_KEY"))
    attempted = (root / "attempted").exists()
    # This is a count allowance, not an invented provider dollar-cap parameter.
    enabled = os.getenv("RUNWARE_GENERATION_ALLOWANCE", "0") == "1"
    cost = None
    if ready:
        cost = json.loads((root / "frame.json").read_text())["cost_usd"]
    return {"provider": "Runware", "hosting": "modal" if os.getenv("WORLD_ASSET_VOLUME") else "local", "configured": configured, "ready": ready,
            "can_generate": configured and enabled and not attempted and not ready,
            "attempted": attempted, "cost_usd": cost}


async def persist():
    # Modal volume commits survive container shutdown; plain local mode needs none.
    name = os.getenv("WORLD_ASSET_VOLUME")
    if name:
        import modal
        await modal.Volume.from_name(name).commit.aio()


def decode_frame(payload, task_id):
    if not isinstance(payload, dict) or payload.get("errors"):
        raise ValueError("Provider did not return a completed image.")
    rows = payload.get("data", [])
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], dict) or rows[0].get("taskUUID") != task_id:
        raise ValueError("Provider image does not match this request.")
    row = rows[0]
    image = base64.b64decode(row.get("imageBase64Data", ""), validate=True)
    if not 24 <= len(image) <= MAX_IMAGE or image[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Expected one PNG below the world model's 2 MB image limit.")
    if image[12:16] != b"IHDR" or struct.unpack(">II", image[16:24]) != (1024, 576):
        raise ValueError("Expected a 1024 by 576 landscape starting frame.")
    # Reject truncated/corrupt containers before caching. The browser additionally
    # decodes pixels before displaying or handing this image to Reactor.
    offset, pixels, ended = 8, False, False
    while offset + 12 <= len(image):
        length = struct.unpack(">I", image[offset:offset + 4])[0]
        end = offset + 12 + length
        if end > len(image):
            raise ValueError("Truncated PNG chunk.")
        kind = image[offset + 4:offset + 8]
        if zlib.crc32(image[offset + 4:end - 4]) != struct.unpack(">I", image[end - 4:end])[0]:
            raise ValueError("Corrupt PNG chunk.")
        pixels = pixels or (kind == b"IDAT" and length > 0)
        offset = end
        if kind == b"IEND":
            ended = length == 0 and offset == len(image)
            break
    if not pixels or not ended:
        raise ValueError("Incomplete PNG image.")
    cost = row.get("cost")
    if isinstance(cost, bool) or not isinstance(cost, (int, float)) or not math.isfinite(cost) or cost < 0:
        raise ValueError("Provider omitted valid cost reporting.")
    return image, float(cost)


@router.get("/status")
async def artwork_status(x_demo_access: str = Header(default=""), x_relativity_client: str = Header(default="")):
    authorized(x_demo_access, x_relativity_client)
    return status()


@router.get("/frame")
async def artwork_frame(x_demo_access: str = Header(default=""), x_relativity_client: str = Header(default="")):
    authorized(x_demo_access, x_relativity_client)
    if not status()["ready"]:
        raise HTTPException(404, "No generated starting frame is cached.")
    return Response((cache_dir() / "frame.png").read_bytes(), media_type="image/png",
                    headers={"Cache-Control": "private, max-age=3600"})


@router.post("/frame")
async def generate_frame(x_demo_access: str = Header(default=""), x_relativity_client: str = Header(default="")):
    authorized(x_demo_access, x_relativity_client)
    async with lock:
        state = status()
        if state["ready"]:
            return state
        if not state["can_generate"]:
            raise HTTPException(409, "Runware needs a server key and an unused one-image allowance.")
        root = cache_dir()
        root.mkdir(parents=True, exist_ok=True)
        task_id = str(uuid4())
        # Record BEFORE submitting. A timeout never causes an automatic paid retry.
        try:
            with (root / "attempted").open("x") as marker:
                marker.write(json.dumps({"task_uuid": task_id, "model": MODEL,
                    "note": "One request reserved. Check this task with Runware before any retry."}))
        except FileExistsError:
            raise HTTPException(409, "This one-image allowance has already been reserved.") from None
        await persist()
        request = [{"taskType": "imageInference", "taskUUID": task_id, "model": MODEL,
                    "positivePrompt": PROMPT, "width": 1024, "height": 576, "steps": 28,
                    "numberResults": 1, "outputType": "base64Data", "outputFormat": "PNG", "includeCost": True}]
        try:
            async with asyncio.timeout(95):
                async with httpx.AsyncClient(timeout=90, follow_redirects=False) as client:
                    result = await client.post("https://api.runware.ai/v1", json=request,
                        headers={"Authorization": "Bearer " + os.environ["RUNWARE_API_KEY"]})
            if result.status_code != 200:
                raise HTTPException(502, f"Runware returned HTTP {result.status_code}; no automatic retry.")
            if len(result.content) > 3_000_000:
                raise ValueError("Provider image response exceeds the size limit.")
            image, cost = decode_frame(result.json(), task_id)
        except (httpx.HTTPError, TimeoutError):
            raise HTTPException(502, "Runware connection failed; check the existing request before retrying.") from None
        except (ValueError, KeyError, TypeError, binascii.Error, struct.error):
            raise HTTPException(502, "Runware returned an invalid image or cost; no automatic retry.") from None
        (root / "frame.png").write_bytes(image)
        (root / "frame.json").write_text(json.dumps({"provider": "Runware", "model": MODEL,
            "task_uuid": task_id, "cost_usd": cost, "sha256": hashlib.sha256(image).hexdigest(),
            "purpose": "Illustrative Reactor starting frame; not a physical sky projection."}))
        await persist()
        return status()
