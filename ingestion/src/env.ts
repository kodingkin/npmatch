import { loadEnvFile } from 'node:process';

loadEnvFile();

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key]?.trim();
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : Math.max(1, parsed);
}

export const config = {
  env: process.env.ENV || "development",
  rawJsonUrl: process.env.RAW_JSON_URL ?? "https://github.com/tristan-f-r/npm-rank/releases/download/latest/raw.json",
  maxPackages: getEnvNumber("PACKAGE_LIMIT", 10000),
  embeddingBatchSize: getEnvNumber("EMBEDDING_BATCH_SIZE", 100),
  upsertBatchSize: getEnvNumber("UPSERT_BATCH_SIZE", 100),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeIndexName: process.env.PINECONE_INDEX_NAME ?? "npmatch",
  databaseUrl: process.env.DATABASE_URL,
  qdrantUrl: process.env.QDRANT_URL
} as const;

if (!config.databaseUrl || !config.databaseUrl || !config.databaseUrl || !config.databaseUrl) {
  throw new Error("Something missing in config");
}
