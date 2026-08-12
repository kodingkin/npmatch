import type { AnalyticsData } from "@/types";

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "x-analytics-token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Analytics request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAnalytics(token: string): Promise<AnalyticsData> {
  const [summary, visits, searches] = await Promise.all([
    getJson<AnalyticsData["summary"]>("/api/analytics?kind=summary", token),
    getJson<AnalyticsData["visits"]>("/api/analytics?kind=visits&limit=25", token),
    getJson<AnalyticsData["searches"]>("/api/analytics?kind=searches&limit=25", token),
  ]);
  return { summary, visits, searches };
}
