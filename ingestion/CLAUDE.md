# CLAUDE.md - Ingestion

Data pipeline: fetch top npm packages, embed descriptions, upsert to Qdrant + Postgres.

## Commands

```bash
npm run ingestion   # Full pipeline: fetch → embed → upsert
npm run lint        # ESLint
npm test            # Jest (ts-jest)
```

## Pipeline (`src/index.ts`)

```
fetchPackages() → embedPackages() → upsertPackages()
```

### 1. Fetch (`fetch.ts`)
- Downloads npm-rank JSON from configured URL
- Filters: skips entries with no name or empty description, deduplicates by name
- Capped at `config.maxPackages`
- Output: `NpmPackage[]` (name, description, keywords, version)

### 2. Embed (`embed.ts`)
- Batches packages and embeds with OpenAI (`text-embedding-3-small`)
- Embedding text format: `"{name}: {description}. keywords: {keywords}"`
- Batch size configured via `config.embeddingBatchSize`
- Output: `EmbeddedPackage[]` (pkg + vector)

### 3. Upsert (`upsert.ts`)
- **Qdrant**: creates `npmatch` collection (1536-dim, cosine) if missing, upserts points with name as payload
- **Postgres**: creates `packages` table with `tsvector` (GIN-indexed) for FTS, upserts metadata with `ON CONFLICT DO UPDATE`
- Both run in parallel per batch (batch size: 100)
- UUIDs for Qdrant are derived from package name via a simple hash

## Environment

- Loads `.env` via `node:process` `loadEnvFile()`
- Key vars: `OPENAI_API_KEY`, `DATABASE_CONNECTION_STRING`, `QDRANT_URL`, `QDRANT_CLOUD_API_KEY`

## CI

The ingestion workflow is `workflow_dispatch` only (manual trigger), not on push. It runs the full pipeline with secrets from GitHub Actions.

## Testing

- Jest with ts-jest for CommonJS TypeScript
- Tests in `src/test/` — one per module (fetch, embed, upsert, env, index)
- Setup file (`src/test/setup.ts`) sets required env vars so `env.ts` doesn't throw at module scope
- All external dependencies are mocked (https, OpenAI, Qdrant, pg)

## Notes

- CommonJS (`"type": "commonjs"`) — uses `require`-style imports
