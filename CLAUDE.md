# CLAUDE.md

## Project

npmatch - AI-powered npm package finder. Describe what you need, get ranked recommendations grounded in real registry data.

## Architecture

```
Browser → Next.js API Route (proxy) → FastAPI backend → Qdrant (vectors) + Postgres (metadata) + OpenAI (GPT-4o streaming)
```

| Service | Directory | Language | Key tech |
|---------|-----------|----------|----------|
| Frontend | `frontend/` | TypeScript | Next.js 15, HeroUI v3, Tailwind v4 |
| Backend | `backend/` | Python 3.13 | FastAPI, uv, asyncpg, Qdrant client |
| Ingestion | `ingestion/` | TypeScript | Node, OpenAI embeddings, Qdrant + Postgres upsert |
| Infra | `infra/` | Terraform | AWS (ECR, ECS) |

## Common commands

```bash
# Start all services locally
docker compose -f docker-compose.yml up -d --build

# Frontend (in frontend/)
npm run dev          # Next.js dev server on :3000
npm run build        # Production build
npm run lint         # ESLint (app dir)
npm test             # Jest
npm run test:watch   # Jest watch mode

# Backend (in backend/)
make dev             # uvicorn --reload on :8000
make test            # pytest
make lint            # ruff check
make lint_fix        # ruff check --fix + format
make bundle          # Verify imports work

# Ingestion (in ingestion/)
npm run ingestion    # Fetch → embed → upsert pipeline
npm run lint         # ESLint
```

## Conventions

- **Frontend API route** (`frontend/app/api/search/route.ts`) proxies to backend — hides backend URL and secrets from the browser
- **Backend search** is a hybrid: concurrent vector search (Qdrant) + FTS (Postgres), fused with Reciprocal Rank Fusion (RRF)
- **Rate limiting**: backend limits `/api/search` to 2 requests/minute per IP (slowapi)
- **SSE protocol**: backend streams `event: packages`, `data:` chunks, `event: done`/`event: error`
- **Tests**: Jest (frontend), pytest + pytest-asyncio (backend), no tests yet for ingestion
- **CI**: path-filtered workflows per service — changes to `frontend/` trigger frontend CI, etc.
- **Branch**: current work is on `feat/update-ui`

## Environment

- `.env` at repo root holds all secrets
- Backend loads via `python-dotenv`, ingestion via `dotenv`, frontend via Next.js env
- `OPENAI_API_KEY` needed for backend + ingestion (fallback `test-key` for dev)

## Coding rules

### General
- Never commit secrets or `.env` files (gitignored)
- Pre-commit hook runs lint per changed service — commits that fail lint are blocked
- Use `/lint-all` to lint everything, `/test-all` to run all tests

### Frontend (TypeScript)
- Client components must have `"use client"` directive at the top
- Components go in `components/`, one file per component
- Types live in `types/index.ts` — no inline type definitions
- Tests go in `components/test/` alongside their components
- Use `@heroui/react` for UI primitives (Link, Separator, Spinner)
- Styling: Tailwind v4 classes, dark theme via `dark` class on `<html>`
- ESLint is strict: unused vars are errors, `console.log` is a warning (use `console.warn`/`console.error` for intentional logging)
- SSE parsing: use the pattern from `hooks/useSearch.ts` — read stream, split on `\n`, handle `event:` / `data:` lines

### Backend (Python)
- Pydantic models go in `app/models.py`
- All endpoints are async, external clients use lazy initialization (see `search.py`)
- Application startup/shutdown logic goes in `lifespan()`
- Tests use pytest-asyncio with `@pytest.mark.asyncio`, mock external services (Qdrant, Postgres, OpenAI) via `unittest.mock.patch`
- Rate limiting: `@limiter.limit("2/minute")` on search endpoint
- Ruff with isort — imports sorted automatically, known-first-party = `app`

### Ingestion (TypeScript)
- CommonJS (`require`, not `import`)
- Pipeline steps are idempotent — `ON CONFLICT DO UPDATE` in Postgres, Qdrant upsert
- Environment loaded via `node:process` `loadEnvFile()`
- All config centralized in `src/env.ts`
