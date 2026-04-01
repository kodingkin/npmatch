# npmatch — backend

FastAPI backend for [npmatch](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

Receives a user query, retrieves relevant packages via Qdrant vector search, and streams an LLM-synthesized recommendation back to the frontend via SSE.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | FastAPI |
| LLM | OpenAI gpt-4o (streaming) |
| Embeddings | OpenAI text-embedding-3-small |
| Vector DB | Qdrant (self-hosted, cosine) |
| Metadata DB | Postgres (asyncpg) |
| Infra | AWS ECS Fargate + ECR + ALB |

---

## Local development

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

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

Embeds the query, retrieves top 6 matching packages from Qdrant, joins to Postgres for full metadata, and streams an LLM recommendation back as SSE.

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

```
event: packages
data: [{"name":"react-markdown","version":"9.0.1","description":"...","npm_url":"..."}]

data: Here are my recommendations...

data:  **react-markdown** is the strongest fit because...

event: done
data: [DONE]
```

Two event types:
- `event: packages` — fires first with structured package data (for rendering cards in the UI)
- `data:` — LLM text chunks, streamed as they arrive
- `event: done` — signals end of stream

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
│   ├── search.py     # Qdrant vector search + Postgres metadata join + OpenAI embeddings
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

See `infra/` for Terraform config and `.github/workflows/` for CI/CD.
