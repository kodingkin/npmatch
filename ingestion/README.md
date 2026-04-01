## Ingestion Pipeline

Script that populates vector indexes with npm package data.

### Workflow

1. **Fetch** — downloads the top 10000 most popular npm packages from [npm-rank](https://github.com/tristan-f-r/npm-rank) as a JSON file
2. **Clean** — filters out packages missing a name or description, deduplicates by package name, and strips irrelevant fields (author, sponsors, maintainers)
3. **Embed** — formats each package as `"{name}: {description}. keywords: {keywords}"` and batch-embeds via OpenAI `text-embedding-3-small` (batches of 100)
4. **Upsert** — pushes vectors + metadata (name, description, keywords, version) into Qdrant. Idempotent — safe to re-run, existing vectors are overwritten not duplicated

### Design Decisions

- **Deduplication by name** — source JSON contains ~4,600 duplicate entries; deduped to ~5,100 unique packages
- **Embedding format** — name + description + keywords concatenated for richer semantic signal than description alone
- **Batch size 100** — balances OpenAI rate limits and reliability; a failed batch doesn't lose the entire run
- **Idempotent upserts** — Qdrant upsert by package name as ID means re-runs are safe and refresh won't duplicate data

### Cost

| Step | Model | Est. cost per run |
|---|---|---|
| Embed 5,100 packages | `text-embedding-3-small` | ~$0.001 |
| Qdrant upsert | Self-hosted / Qdrant Cloud free tier | $0 |
| Postgres insert | Neon / Supabase free tier (local or VPS) | $0 |

### Running Locally
```bash
cp .env.example .env
# fill in OPENAI_API_KEY

npm install
tsx src/index.ts
```
