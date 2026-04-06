# 📦 npmatch

> Find the right npm package — describe what you need, get AI-powered recommendations grounded in real registry data.

**[Live Demo](https://npmatch.vercel.app/)** · **[Backend API](https://npmatch-backend.vercel.app/redoc)**

## ✨ What it does

Searching npm is painful. `npmatch` lets you describe what you're trying to build in plain English, and returns ranked package recommendations with tradeoff explanations — powered by semantic search over real npm data and streamed LLM synthesis.

- 🔍 **Semantic search** — finds packages by meaning, not just keywords
- ⚡ **Streaming UX** — recommendations stream in token by token as they're generated
- 📊 **Grounded results** — LLM only recommends from retrieved real packages, no hallucination
- 🎯 **Filter by framework and priorities** — React vs Node, bundle size vs popularity vs TypeScript support

## 🏗️ Architecture

```
Browser
  ↓
Next.js API Route (/api/search)   ← proxy layer, hides backend URL + secrets
  ↓
FastAPI backend
  ↓       ↓          ↓
Qdrant  Postgres   OpenAI
(vec)   (metadata) (gpt-4o)
```

**RAG pipeline:**
1. User query is embedded via `text-embedding-3-small`
2. Qdrant returns top 6 semantically similar package names
3. Postgres is joined for full metadata (description, keywords, version)
4. Retrieved packages + query are passed to GPT-4o as context
5. LLM synthesizes a recommendation — streamed back to the browser via SSE

The LLM never guesses from training memory. It only reasons over the retrieved packages, keeping recommendations verifiable and current.

## 🛠️ Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, TypeScript, HeroUI v3, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.13, uv |
| LLM | OpenAI GPT-4o (streaming) |
| Embeddings | OpenAI text-embedding-3-small |
| Vector DB | Qdrant |
| Metadata DB | Postgres (asyncpg) |
| Ingestion | Node.js, TypeScript |
| Infra | AWS ECS Fargate, ECR, ALB, Terraform, VPS, Docker |
| CI/CD | GitHub Actions |

## 📁 Project structure

```
npmatch/
├── README.md
├── docker-compose.yml          # local full-stack dev
│
├── ingestion/                  # Node.js — data pipeline
│   ├── src/
│   │   ├── fetch.ts            # pulls top packages
│   │   ├── embed.ts            # OpenAI embeddings
│   │   └── upsert.ts           # pushes vectors to DB
│   └── Dockerfile
│
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py             # routes, middleware, CORS, rate limiting
│   │   ├── search.py           # embed query + vector search
│   │   ├── llm.py              # GPT-4o streaming + prompt construction
│   │   └── models.py           # Pydantic request/ response models
│   └── Dockerfile
│
├── frontend/                   # Next.js
│   ├── app/
│   │   ├── page.tsx
│   │   └── api/
│   │       └── search/         # SSE proxy to backend
│   │           ├── route.ts 
│   │           └── health/     # health check proxy
│   │               └── route.ts 
│   ├── components/
│   │   ├── SearchForm.tsx
│   │   ├── PackageCard.tsx
│   │   ├── StatusStates.tsx
│   │   └── LlmPanel.tsx
│   └── hooks/
│       ├── useSearch.ts        # SSE streaming logic
│       └── useHealthCheck.ts   # backend health polling
│
└── infra/                      # Terraform
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── modules/
        ├── ecs/
        └── networking/
```

## 🔌 API

### `POST /api/search`

Streams package recommendations as SSE.

**Request**
```json
{
  "query": "parse markdown with syntax highlighting in React",
  "framework": "react",
  "priorities": ["bundle size", "TypeScript support"]
}
```

**SSE stream format**
```
event: packages
data: [{"name": "...", "version": "...", "description": "...", "npm_url": "..."}]

data: chunk chunk chunk...   ← LLM markdown, \n escaped as \\n

event: done
data: [DONE]
```

### `GET /health`

Returns backend status. Polled by frontend every 60s with animated signal indicator.

## 🗄️ Data pipeline

npm's search API is capped at 250 results — not enough for meaningful semantic search. Instead:

1. **Fetch** — downloads the top 10000 most popular npm packages from [npm-rank](https://github.com/tristan-f-r/npm-rank) as a JSON file
2. **Clean** — filters out packages missing a name or description, deduplicates by package name, and strips irrelevant fields (author, sponsors, maintainers)
3. **Embed** — formats each package as `"{name}: {description}. keywords: {keywords}"` and batch-embeds via OpenAI `text-embedding-3-small` (batches of 100)
4. **Upsert** — pushes vectors into Qdrant (payload: `name` only) and metadata (name, description, keywords, version) into Postgres. Idempotent — safe to re-run, Qdrant upserts overwrite by deterministic UUID, Postgres upserts use `ON CONFLICT (name) DO UPDATE`

## ☁️ Infrastructure

Managed with Terraform. All AWS resources are defined as code in `/infra`.

```
ECR (3 repos)
  npmatch-ingestion
  npmatch-backend
  npmatch-frontend (not used — frontend on Vercel)

ECS Fargate
  backend service (always-on, behind ALB)
  ingestion scheduled task (weekly via EventBridge)

ALB
  HTTPS termination
  rate limiting in production

VPC
  public + private subnets
  security groups
```

> 💡 The live demo runs on VPS. To spin up a full AWS deployment yourself: `terraform apply` in `/infra`. To tear it down: `terraform destroy`.

## 🚀 Running locally

**Prerequisites:** Docker, Node.js 20+, Python 3.13+, OpenAI API key

### Full stack with Docker Compose

```bash
# clone the repo
git clone https://github.com/kodingkin/npmatch
cd npmatch

# add environment variables
cp backend/.env.example backend/.env
# fill in OPENAI_API_KEY

cp frontend/.env.example frontend/.env

# start backend + frontend
docker compose -f 'docker-compose.yml' up -d --build 
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:8000`

## 🌱 Ingestion (seed the vector DB)

```bash
cd ingestion
npm install

cp .env.example .env
# fill in OPENAI_API_KEY

tsx src/index.ts
```

## 🎯 Design decisions

**Why RAG instead of asking GPT-4o directly?**
LLMs hallucinate package names and versions. By retrieving real packages from Vector Database first and passing them as context, the LLM only reasons over verified data — recommendations are grounded and verifiable.

**Why SSE over WebSockets?**
Streaming is one-directional (server → client). SSE is simpler, stateless, and works over standard HTTP — no connection management overhead.

**Why Next.js API route as proxy?**
Keeps the backend URL off the client entirely. The browser never talks to FastAPI directly.

**Why Qdrant + Postgres over Pinecone?**
Pinecone bundles vectors and metadata together in a single managed service — simple, but not how production systems are typically designed. Splitting vector search (Qdrant) from structured metadata (Postgres) reflects real-world architecture patterns and keeps each store doing what it's good at. Qdrant runs as a Docker image across local, VPS, and EKS. Postgres is Neon on VPS and RDS on AWS.

**Why `text-embedding-3-small`?**
Good balance of semantic quality and cost at 5k vectors. Upgrade path to `text-embedding-3-large` is a one-line change.

## 📋 Known limitations

- Ingestion is a point-in-time snapshot — very new packages may not appear until the next weekly refresh
- No re-ranking step — production would add a cross-encoder re-ranker to improve retrieval precision
- No evaluation pipeline — answer faithfulness and retrieval quality are not measured automatically
- Rate limited to 2 requests/minute per IP

## 👤 Author

Built as a portfolio project demonstrating full-stack AI integration — RAG pipeline, streaming UX, and AWS infrastructure with Terraform.