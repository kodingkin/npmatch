import https from "https";

import { config } from "./env";

export interface NpmPackage {
  name: string;
  description: string;
  keywords: string[];
  version: string;
}

const RAW_JSON_URL = config.rawJsonUrl;
const LIMIT = config.maxPackages;

function fetchJson(url: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(e);
        }
      });
      res.on("error", reject);
    });
  });
}

export async function fetchPackages(): Promise<NpmPackage[]> {
  console.log("Fetching npm-rank JSON...");

  const raw = await fetchJson(RAW_JSON_URL);

  const seen = new Set<string>();

  const packages = raw
    .filter((pkg: any) => {
      if (!pkg.name || !pkg.description?.trim()) return false;
      if (seen.has(pkg.name)) return false;
      seen.add(pkg.name);
      return true;
    })
    .slice(0, LIMIT)
    .map((pkg: any): NpmPackage => ({
      name: pkg.name,
      description: pkg.description,
      keywords: Array.isArray(pkg.keywords) ? pkg.keywords : [],
      version: pkg.version ?? "unknown",
    }));

  console.log(`Fetched ${packages.length} packages`);
  return packages;
}