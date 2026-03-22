import https from "https";

export interface NpmPackage {
  name: string;
  description: string;
  keywords: string[];
  version: string;
  npm_url: string;
}

const RAW_JSON_URL =
  "https://github.com/tristan-f-r/npm-rank/releases/download/latest/raw.json";

const LIMIT = 3;

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

  const packages = raw
    .filter((pkg: any) => pkg.name && pkg.description?.trim())
    .slice(0, LIMIT)
    .map((pkg: any): NpmPackage => ({
      name: pkg.name,
      description: pkg.description,
      keywords: Array.isArray(pkg.keywords) ? pkg.keywords : [],
      version: pkg.version ?? "unknown",
      npm_url: pkg.links?.npm ?? `https://www.npmjs.com/package/${pkg.name}`,
    }));

  console.log(`Fetched ${packages.length} packages`);
  return packages;
}