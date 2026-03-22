import { fetchPackages } from "./fetch";

async function main() {
  try {
    const packages = await fetchPackages();

    console.log(`\n Done. ${packages.length} packages fetched.`);
    console.log("\nSample (first 3):");
    packages.slice(0, 3).forEach((pkg) => {
      console.log(`  - ${pkg.name}`);
      console.log(`    ${pkg.description.slice(0, 80)}...`);
    });
  } catch (err) {
    console.error("Fetch failed: ", err);
    process.exit(1);
  }
}

main();