// jest setup: set required env vars so env.ts doesn't throw at module scope
process.env.DATABASE_CONNECTION_STRING = "postgres://localhost:5432/test";
process.env.QDRANT_URL = "http://localhost:6333";
process.env.OPENAI_API_KEY = "sk-test-key";
