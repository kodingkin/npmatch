import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from slowapi import Limiter

import app.env
from app.analytics import (
    client_ip,
    get_analytics_summary,
    hash_ip,
    list_page_views,
    list_searches,
    record_page_view,
    record_search,
)
from app.llm import stream_response
from app.models import SearchRequest
from app.search import package_search

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("npmatch backend starting up")
    yield
    logger.info("npmatch backend shutting down")


app = FastAPI(title="npmatch", version="1.0.0", lifespan=lifespan)


def rate_limit_key(request: Request) -> str:
    """Key rate limits by the real client IP.

    The backend sits behind the Next.js proxy, so request.client.host is the
    proxy, not the user. The proxy forwards X-Forwarded-For; take the leftmost
    (client-supplied) entry, falling back to the direct peer. This is only safe
    because clients cannot reach the backend directly.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=rate_limit_key)
app.state.limiter = limiter

allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://frontend:3000,https://npmatch.vercel.app",
).split(",")
allow_headers = ["Content-Type"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["OPTIONS", "GET", "POST"],
    allow_headers=allow_headers,
)


@app.get("/health")
async def health():
    return {"status": "ok"}


def _require_analytics_token(request: Request) -> None:
    expected = os.environ.get("ANALYTICS_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="Analytics token not configured")
    if request.headers.get("x-analytics-token") != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/api/track/pageview")
@limiter.limit("120/minute")
async def track_pageview(request: Request):
    referrer = None
    try:
        body = await request.json()
        referrer = body.get("referrer")
    except Exception:
        pass

    try:
        await record_page_view(
            ip_hash=hash_ip(client_ip(request)),
            user_agent=request.headers.get("user-agent"),
            referrer=referrer or request.headers.get("referer"),
        )
    except Exception as e:
        logger.warning(f"Failed to record page view: {e}")

    return {"ok": True}


@app.get("/api/analytics/summary")
async def analytics_summary(request: Request):
    _require_analytics_token(request)
    try:
        return await get_analytics_summary()
    except Exception:
        logger.exception("Analytics summary failed")
        raise HTTPException(status_code=502, detail="Analytics query failed") from None


@app.get("/api/analytics/visits")
async def analytics_visits(request: Request, limit: int = 50):
    _require_analytics_token(request)
    try:
        return await list_page_views(limit=min(limit, 200))
    except Exception:
        logger.exception("Analytics visits failed")
        raise HTTPException(status_code=502, detail="Analytics query failed") from None


@app.get("/api/analytics/searches")
async def analytics_searches(request: Request, limit: int = 50):
    _require_analytics_token(request)
    try:
        return await list_searches(limit=min(limit, 200))
    except Exception:
        logger.exception("Analytics searches failed")
        raise HTTPException(status_code=502, detail="Analytics query failed") from None


@app.post("/api/search")
@limiter.limit("10/minute")
async def search(request: Request, body: SearchRequest):
    logger.info(
        f"Search request: query='{body.query}' "
        f"framework={body.framework} priorities={body.priorities}"
    )

    try:
        packages = await package_search(body.query)
    except Exception:
        logger.exception("Package search failed")
        raise HTTPException(status_code=502, detail="Failed in hybrid search") from None

    try:
        await record_search(
            query=body.query,
            framework=body.framework,
            priorities=body.priorities,
            result_count=len(packages),
            ip_hash=hash_ip(client_ip(request)),
            user_agent=request.headers.get("user-agent"),
        )
    except Exception as e:
        logger.warning(f"Failed to record search event: {e}")

    if not packages:
        logger.info("No packages found for query, returning empty response")

        async def empty_generator():
            yield "event: done\ndata: [DONE]\n\n"

        return StreamingResponse(
            empty_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    logger.info(f"Retrieved {len(packages)} packages: {[p['name'] for p in packages]}")

    async def event_generator():
        package_data = [
            {
                "name": p["name"],
                "description": p["description"],
                "version": p["version"],
                "npm_url": p["npm_url"],
            }
            for p in packages
        ]
        yield f"event: packages\ndata: {json.dumps(package_data)}\n\n"

        try:
            async for chunk in stream_response(
                query=body.query,
                packages=packages,
                framework=body.framework,
                priorities=body.priorities,
            ):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            logger.error(f"LLM streaming failed: {e}")
            yield "event: error\ndata: LLM streaming failed\n\n"
            return

        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
