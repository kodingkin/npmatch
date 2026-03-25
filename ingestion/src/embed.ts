import OpenAI from "openai";

import type { NpmPackage } from "./fetch";
import { config } from "./env";

export interface EmbeddedPackage {
  pkg: NpmPackage;
  vector: number[];
}

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

const BATCH_SIZE = config.embeddingBatchSize;
const MODEL = config.openaiEmbeddingModel!;

function toEmbeddingText(pkg: NpmPackage): string {
  const keywords = pkg.keywords.join(", ");
  return `${pkg.name}: ${pkg.description}. keywords: ${keywords}`;
}

async function embedBatch(packages: NpmPackage[]): Promise<EmbeddedPackage[]> {
  const inputs = packages.map(toEmbeddingText);

  const response = await openai.embeddings.create({
    model: MODEL,
    input: inputs,
  });

  return response.data.map((item, i) => ({
    pkg: packages[i],
    vector: item.embedding,
  }));
}

export async function embedPackages(
  packages: NpmPackage[]
): Promise<EmbeddedPackage[]> {
  console.log(`Embedding ${packages.length} packages in batches of ${BATCH_SIZE}...`);

  const results: EmbeddedPackage[] = [];

  for (let i = 0; i < packages.length; i += BATCH_SIZE) {
    const batch = packages.slice(i, i + BATCH_SIZE);
    const embedded = await embedBatch(batch);
    results.push(...embedded);

    const progress = Math.min(i + BATCH_SIZE, packages.length);
    console.log(`  ${progress}/${packages.length}`);
  }

  console.log(`✅ Done embedding.`);
  return results;
}