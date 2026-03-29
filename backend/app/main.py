import os
import json
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models import SearchRequest
from app.search import embed_query, vector_search
from app.llm import stream_response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("npmatch backend starting up")
    yield
    logger.info("npmatch backend shutting down")


app = FastAPI(title="npmatch", version="1.0.0", lifespan=lifespan)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://npmatch.vercel.app",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET = os.getenv("API_SECRET")

app.add_middleware("http")
async def verify_secret(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        if request.headers.get("X-Secret") != SECRET:
            return JSONResponse({"detail": "forbidden"}, status_code=403)
    return await call_next(request)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/search")
@limiter.limit("5/minute")
async def search(request: SearchRequest):
    logger.info(
        f"Search request: query='{request.query}' framework={request.framework} priorities={request.priorities}"
    )

    try:
        embedding = await embed_query(request.query)
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to embed query")

    try:
        packages = await vector_search(embedding)
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to query vector database")

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
                query=request.query,
                packages=packages,
                framework=request.framework,
                priorities=request.priorities,
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
        headers={
            "Cache-Control": "no-cache"
        },
    )
