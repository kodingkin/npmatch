# npmatch — backend

FastAPI backend for [npmatch](https://npmatch).

Receives a user query, runs hybrid search (Qdrant vector search + Postgres full-text search) fused with RRF, and streams an LLM-synthesized recommendation back to the frontend via SSE.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | FastAPI |
| LLM | OpenAI gpt-4o (streaming) |
| Embeddings | OpenAI text-embedding-3-small |
| Vector DB | Qdrant (self-hosted, cosine) |
| Metadata DB | Postgres (asyncpg) |
| Infra | AWS EKS + ECR + ALB |

---

## How search works

Hybrid search over ~5k npm packages, fused with Reciprocal Rank Fusion (RRF).

```
User query
    ↓
┌─────────────────────────┬──────────────────────────┐
│ embed → Qdrant search   │  Postgres FTS             │
│ (dense / semantic)      │  (sparse / keyword)       │
│ top 20 by cosine sim    │  top 20 by ts_rank        │
└─────────────────────────┴──────────────────────────┘
    both run concurrently via asyncio.gather
    ↓
RRF fusion → top 5 names
    ↓
Postgres metadata fetch (single query)
    ↓
GPT-4o recommendation — streamed via SSE
```

**Dense search** (Qdrant) — finds semantically similar packages even with no keyword overlap. "render rich text" matches packages described as markdown renderers.

**Sparse search** (Postgres FTS) — finds packages that literally contain the query terms. Uses `to_tsvector` + `plainto_tsquery` with English stemming. Computed at query time — no migration needed at current scale.

**RRF** — packages appearing in both lists rank highest. Formula: `score = Σ 1 / (60 + rank)` per list. k=60 is the standard constant.

---

## Local development

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Qdrant running locally (Docker)
- Postgres running locally (Docker)

### Setup

```bash
git clone https://github.com/kodingkin/npmatch
cd npmatch/backend

uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv sync
cp .env.example .env
# fill in OPENAI_API_KEY

make dev
```

API will be available at `http://localhost:8000`.

Health check: `GET http://localhost:8000/health`


## API

### `POST /api/search`

Embeds the query, retrieves the top 20 matching packages from Qdrant and Postgres, combines the results using RRF, reduces the list to the top six, fetches full metadata from Postgres, and streams an LLM recommendation back via SSE.

**Request**

```json
{
  "query": "I need a library to parse markdown with syntax highlighting in React",
  "framework": "react",
  "priorities": ["bundle size", "TypeScript support"]
}
```

`framework` and `priorities` are optional.

**Response** — `text/event-stream`

Always `200`. Three possible shapes:

**Results found:**
```
event: packages
data: [{"name":"react-markdown","version":"9.0.1","description":"...","npm_url":"..."}]

data: Here are my recommendations...

data:  **react-markdown** is the strongest fit because...

event: done
data: [DONE]
```

**No results:**
```
event: done
data: [DONE]
```

**Stream error:**
```
event: error
data: LLM streaming failed

event: done
data: [DONE]
```

### `GET /health`

Returns `{"status": "ok"}`. Used by ALB health checks.

---

## Project structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── env.py
│   ├── main.py       # FastAPI app, CORS, routes
│   ├── search.py     # Hybrid search: Qdrant + Postgres FTS + RRF
│   ├── llm.py        # Prompt builder + streaming GPT-4o
│   └── models.py     # Pydantic request models
├── .env
├── .gitignore
├── .dockerignore
├── Dockerfile
├── pyproject.toml
└── uv.lock
```

---

## Docker

### Build

```bash
docker build -t npmatch-backend .
```

### Run

```bash
docker run -p 8000:8000 --env-file .env npmatch-backend
```

## Linting

```bash
uv run ruff check app/        # lint
uv run ruff check app/ --fix  # auto-fix
uv run ruff format app/       # format
```

---

## Deployment (WIP)

Deployed on AWS ECS Fargate behind an Application Load Balancer.

On merge to `main`, GitHub Actions builds a Docker image, pushes to ECR, and triggers an ECS deployment. ALB handles SSL termination.

See `infra/terraform/` for Terraform config and `.github/workflows/` for CI/CD.