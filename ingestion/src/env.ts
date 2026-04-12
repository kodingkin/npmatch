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
  connectionString: process.env.DATABASE_CONNECTION_STRING,
  qdrantUrl: process.env.QDRANT_URL,
  qdrantApiKey: process.env.QDRANT_CLOUD_API_KEY
} as const;

if (!config.connectionString) {
  throw new Error("connectionString missing in config");
}
if (!config.qdrantUrl) {
  throw new Error("qdrantUrl missing in config");
}
if (!config.openaiApiKey) {
  throw new Error("openaiApiKey missing in config");
}
