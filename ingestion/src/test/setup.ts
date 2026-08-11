// jest setup: pin env vars so env.ts doesn't throw at module scope
// and "uses defaults for optional values" is deterministic
// (process.loadEnvFile does not overwrite already-set vars)
process.env.DATABASE_CONNECTION_STRING = "postgres://localhost:5432/test";
process.env.QDRANT_URL = "http://localhost:6333";
process.env.OPENAI_API_KEY = "sk-test-key";
process.env.PACKAGE_LIMIT = "10000";
process.env.EMBEDDING_BATCH_SIZE = "100";
process.env.UPSERT_BATCH_SIZE = "100";
process.env.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
