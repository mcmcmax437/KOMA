"""Camoufox page fetcher. The API calls POST /fetch and gets the response body back."""
import asyncio
import os
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from camoufox.async_api import AsyncCamoufox
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

ALLOWED_HOSTS = [h.strip().lower() for h in os.getenv("FETCH_ALLOWED_HOSTS", "com-x.life,mangalib.me,cdnlibs.org").split(",") if h.strip()]
ALLOWED_HEADERS = {"referer": "Referer", "site-id": "Site-Id", "accept": "Accept"}
CONCURRENCY = int(os.getenv("FETCH_CONCURRENCY", "2"))
DEFAULT_TIMEOUT_MS = int(os.getenv("FETCH_TIMEOUT_MS", "20000"))

state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    manager = AsyncCamoufox(headless=True)
    state["browser"] = await manager.__aenter__()
    state["gate"] = asyncio.Semaphore(CONCURRENCY)
    try:
        yield
    finally:
        await manager.__aexit__(None, None, None)


app = FastAPI(lifespan=lifespan)


class FetchRequest(BaseModel):
    url: str
    headers: dict[str, str] = {}
    timeoutMs: int = DEFAULT_TIMEOUT_MS


def host_allowed(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    host = parsed.hostname.lower()
    return any(host == allowed or host.endswith("." + allowed) for allowed in ALLOWED_HOSTS)


@app.get("/health")
async def health():
    return {"ok": "browser" in state}


@app.post("/fetch")
async def fetch(req: FetchRequest):
    if not host_allowed(req.url):
        raise HTTPException(status_code=400, detail="host not allowed")
    headers = {ALLOWED_HEADERS[k.lower()]: v for k, v in req.headers.items() if k.lower() in ALLOWED_HEADERS}
    timeout = max(1000, min(req.timeoutMs, 60000))
    async with state["gate"]:
        context = await state["browser"].new_context()
        try:
            page = await context.new_page()
            if headers:
                await page.set_extra_http_headers(headers)
            response = await page.goto(req.url, wait_until="domcontentloaded", timeout=timeout)
            if response is None:
                raise HTTPException(status_code=502, detail="no response")
            body = await response.text()
            return {
                "status": response.status,
                "contentType": response.headers.get("content-type", ""),
                "url": page.url,
                "body": body,
            }
        except HTTPException:
            raise
        except Exception as error:  # noqa: BLE001
            raise HTTPException(status_code=504, detail=type(error).__name__) from error
        finally:
            await context.close()
