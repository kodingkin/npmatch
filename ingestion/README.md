## Ingestion Pipeline

A one-time seed script (also runs by needs via GitHub Actions) that populates the Pinecone vector index with npm package data.

### Workflow

1. **Fetch** — downloads the top ~10k most popular npm packages from [npm-rank](https://github.com/tristan-f-r/npm-rank) as a JSON file
2. **Clean** — filters out packages missing a name or description, deduplicates by package name, and strips irrelevant fields (author, sponsors, maintainers)
3. **Embed** — formats each package as `"{name}: {description}. keywords: {keywords}"` and batch-embeds via OpenAI `text-embedding-3-small` (batches of 100)
4. **Upsert** — pushes vectors + metadata (name, description, keywords, version) into Pinecone. Idempotent — safe to re-run, existing vectors are overwritten not duplicated

### Design Decisions

- **npm-rank over BigQuery** — `bigquery-public-data.npmjs` dataset doesn't contain data like description or keywords; npm-rank provides a pre-ranked list of popular packages with richer metadata including keywords
- **Deduplication by name** — source JSON contains ~4,600 duplicate entries; deduped to ~5,100 unique packages
- **Embedding format** — name + description + keywords concatenated for richer semantic signal than description alone
- **Batch size 100** — balances OpenAI rate limits and reliability; a failed batch doesn't lose the entire run
- **Idempotent upserts** — Pinecone upsert by package name as ID means re-runs are safe and weekly refresh won't duplicate data

### Cost

| Step | Model | Est. cost per run |
|---|---|---|
| Embed 5,100 packages | `text-embedding-3-small` | ~$0.001 |
| Pinecone upsert | Serverless free tier | $0 |

### Running Locally
```bash
cp .env.example .env
# fill in OPENAI_API_KEY and PINECONE_API_KEY

npm install
tsx src/index.ts
```

### Scheduled Refresh (WIP)

Runs every Sunday 2am UTC via GitHub Actions `workflow_dispatch` + `schedule`. Pulls the latest image from ECR and re-runs the full pipeline.
