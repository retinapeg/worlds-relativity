"""The same protected FastAPI application, on CPU-only Modal."""
import os
from pathlib import Path

import modal
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env.server", override=False)
app = modal.App("worlds-relativity-bridge")
image = (modal.Image.debian_slim(python_version="3.13")
         .pip_install("fastapi==0.128.8", "httpx==0.28.1", "python-dotenv==1.2.1")
         .add_local_python_source("backend"))
# Provider keys remain server-side; Runware stays disabled without its allowance.
credentials = modal.Secret.from_dict({key: os.environ[key]
    for key in ("REACTOR_API_KEY", "DEMO_ACCESS_TOKEN", "RUNWARE_API_KEY") if os.environ.get(key)})
artwork = modal.Volume.from_name("relativity-world-artwork", create_if_missing=True)


@app.function(image=image, secrets=[credentials], max_containers=1,
              volumes={"/world-assets": artwork},
              env={"WORLD_ASSET_CACHE": "/world-assets", "WORLD_ASSET_VOLUME": "relativity-world-artwork",
                   "RUNWARE_GENERATION_ALLOWANCE": os.getenv("RUNWARE_GENERATION_ALLOWANCE", "0")},
              scaledown_window=30, timeout=150, cpu=0.25, memory=256)
@modal.asgi_app()
def web():
    from backend.app import app as fastapi_app
    return fastapi_app
