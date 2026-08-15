import { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const ANALYTICS_TOKEN = process.env.ANALYTICS_TOKEN;

const ENDPOINTS: Record<string, (limit: number) => string> = {
  summary: () => "/api/analytics/summary",
  visits: (limit) => `/api/analytics/visits?limit=${limit}`,
  searches: (limit) => `/api/analytics/searches?limit=${limit}`,
};

function json(body: unknown, status: number, cacheControl = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cacheControl },
  });
}

export async function GET(req: NextRequest) {
  if (!ANALYTICS_TOKEN || req.headers.get("x-analytics-token") !== ANALYTICS_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }

  const kind = req.nextUrl.searchParams.get("kind") ?? "";
  const buildPath = ENDPOINTS[kind];
  if (!buildPath) {
    return json({ error: "Unknown analytics kind" }, 400);
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 25);
  const upstream = await fetch(`${API_URL}${buildPath(limit)}`, {
    headers: { "x-analytics-token": ANALYTICS_TOKEN },
  });

  if (!upstream.ok) {
    return json({ error: "Backend analytics request failed" }, upstream.status);
  }

  return json(await upstream.json(), 200);
}
