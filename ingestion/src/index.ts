import { embedPackages } from "./embed";
import { fetchPackages } from "./fetch";
import { upsertPackages } from "./upsert";

async function main() {
  try {
    const packages = await fetchPackages();
    
    const embedded = await embedPackages(packages);

    await upsertPackages(embedded);
    
    console.log("\n✅ Ingestion complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err);
    process.exit(1);
  }
}

main();