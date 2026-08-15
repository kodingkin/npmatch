# CLAUDE.md - Backend

FastAPI backend with hybrid search (Qdrant vector + Postgres FTS) and GPT-4o streaming.

## Commands

```bash
make dev        # uvicorn --reload on :8000
make test       # pytest
make lint       # ruff check
make lint_fix   # ruff check --fix + ruff format
make bundle     # verify imports resolve
```

## Architecture

```
POST /api/search     → package_search() → stream_response()
GET  /health         → {"status": "ok"}
```

### Search pipeline (`app/search.py`)

1. **Hybrid retrieval** — concurrent: `_embed_query()` → Qdrant vector search (dense) + Postgres FTS (sparse)
2. **RRF fusion** — `_rrf()` merges the two ranked lists with Reciprocal Rank Fusion (k=60)
3. **Metadata fetch** — single Postgres query fetches name, description, keywords, version for top-6
4. **Streaming** — first yields `event: packages` with metadata, then streams GPT-4o tokens as SSE

### LLM (`app/llm.py`)

- `build_prompt()` constructs a few-shot prompt with package metadata, user query, framework filter, and priorities
- `stream_response()` calls GPT-4o with `temperature=0.3`, yields tokens (newlines escaped as `\\n`)

### Models (`app/models.py`)

- `SearchRequest`: `query` (1-1000 chars), optional `framework` (react/vue/node), optional `priorities` list

### Dependencies

- **Qdrant** (AsyncQdrantClient) — vector DB, cosine distance
- **Postgres** (asyncpg) — metadata + full-text search with `tsvector` + GIN index
- **OpenAI** — `text-embedding-3-small` for queries, `gpt-4o` for streaming recommendations
- **slowapi** — rate limiting at 10 req/min per client IP

## Rate limiting

`/api/search` is limited to **10 requests per minute** per client IP. The limiter keys on the
leftmost `X-Forwarded-For` entry (the Next.js proxy forwards the real client IP), falling back to
the direct peer. See `rate_limit_key()` in `app/main.py`.

## Testing

- pytest + pytest-asyncio for async test support
- pytest-mock for mocking
- Tests in `app/test/` — covers models, search, and LLM
- Tests use env vars directly; no test database — mocking is used for external services

## Environment

- Loads `.env` from repo root via `python-dotenv` (in `app/env.py` — imported first in `main.py`)
- Key env vars: `OPENAI_API_KEY`, `DATABASE_CONNECTION_STRING`, `QDRANT_URL`, `QDRANT_CLOUD_API_KEY`, `ALLOWED_ORIGINS`
