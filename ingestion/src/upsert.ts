import { Pinecone } from "@pinecone-database/pinecone";

import type { EmbeddedPackage } from "./embed";
import { config } from "./env";

const pinecone = new Pinecone({
  apiKey: config.pineconeApiKey!
});

const INDEX_NAME = config.pineconeIndexName!;
const UPSERT_BATCH_SIZE = config.upsertBatchSize;

export async function upsertPackages(embedded: EmbeddedPackage[]): Promise<void> {
  const index = pinecone.index(INDEX_NAME);

  console.log(`Upserting ${embedded.length} vectors to Pinecone...`);

  for (let i = 0; i < embedded.length; i += UPSERT_BATCH_SIZE) {
    const batch = embedded.slice(i, i + UPSERT_BATCH_SIZE);

    const vectors = batch.map(({ pkg, vector }) => ({
      id: pkg.name,
      values: vector,
      metadata: {
        name: pkg.name,
        description: pkg.description,
        keywords: pkg.keywords.join(", "),
        version: pkg.version,
      },
    }));

    await index.upsert({ records: vectors });

    const progress = Math.min(i + UPSERT_BATCH_SIZE, embedded.length);
    console.log(`  ${progress}/${embedded.length}`);
  }

  console.log(`✅ Done upserting.`);

  const stats = await index.describeIndexStats();
  console.log("Pinecone stats:", JSON.stringify(stats, null, 2));
}