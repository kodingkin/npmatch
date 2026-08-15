import { QdrantClient } from "@qdrant/js-client-rest";
import pg from "pg";
import type { EmbeddedPackage } from "./embed";
import { config } from "./env";

const COLLECTION_NAME = "npmatch";
const VECTOR_DIM = 1536;
const BATCH_SIZE = 100;

const qdrant = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey
});

const pool = new pg.Pool({
  connectionString: config.connectionString,
});

async function ensureQdrantCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: VECTOR_DIM, distance: "Cosine" },
    });
    console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
  }
}

async function upsertToQdrant(batch: EmbeddedPackage[]): Promise<void> {
  const points = batch.map(({ pkg, vector }) => ({
    id: stringToUuid(pkg.name),
    vector,
    payload: { name: pkg.name },
  }));

  await qdrant.upsert(COLLECTION_NAME, { points, wait: true });
}

async function ensurePgTable(): Promise<void> {
  // await pool.query(`DROP TABLE IF EXISTS packages`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS packages (
      name TEXT PRIMARY KEY,
      description TEXT,
      keywords TEXT,
      version TEXT,

      search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(keywords, '')), 'C')
      ) STORED
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_packages_search_vector
    ON packages USING GIN(search_vector)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_views (
      id BIGSERIAL PRIMARY KEY,
      visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ip_hash TEXT,
      user_agent TEXT,
      referrer TEXT
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_page_views_visited_at
    ON page_views (visited_at DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_events (
      id BIGSERIAL PRIMARY KEY,
      searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      query TEXT NOT NULL,
      framework TEXT,
      priorities TEXT,
      result_count INTEGER,
      ip_hash TEXT,
      user_agent TEXT
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_search_events_searched_at
    ON search_events (searched_at DESC)
  `);

  console.log("Postgres table ready");
}

async function upsertToPg(batch: EmbeddedPackage[]): Promise<void> {
  const values = batch.map(({ pkg }) => [
    pkg.name,
    pkg.description,
    pkg.keywords.join(", "),
    pkg.version,
  ]);

  await pool.query(`
    INSERT INTO packages (name, description, keywords, version)
    SELECT * FROM unnest(
      $1::text[], $2::text[], $3::text[], $4::text[]
    )
    ON CONFLICT (name) DO UPDATE SET
      description = EXCLUDED.description,
      keywords    = EXCLUDED.keywords,
      version     = EXCLUDED.version
  `, [
    values.map((v) => v[0]),
    values.map((v) => v[1]),
    values.map((v) => v[2]),
    values.map((v) => v[3]),
  ]);
}

function stringToUuid(str: string): string {
  const hash = Array.from(str).reduce((acc, c) => {
    const h = (acc << 5) - acc + c.charCodeAt(0);
    return h & h;
  }, 0);
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hex}-0000-0000-0000-${"0".repeat(12)}`;
}

export async function upsertPackages(embedded: EmbeddedPackage[]): Promise<void> {
  await ensureQdrantCollection();
  await ensurePgTable();

  console.log(`Upserting ${embedded.length} packages...`);

  for (let i = 0; i < embedded.length; i += BATCH_SIZE) {
    const batch = embedded.slice(i, i + BATCH_SIZE);

    await Promise.all([
      upsertToQdrant(batch),
      upsertToPg(batch),
    ]);

    const progress = Math.min(i + BATCH_SIZE, embedded.length);
    console.log(`  ${progress}/${embedded.length}`);
  }

  await pool.end();
  console.log("✅ Done upserting.");
}