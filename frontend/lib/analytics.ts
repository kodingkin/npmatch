import type { AnalyticsData, AnalyticsResult } from "@/types";

type SectionResult<T> = { ok: true; value: T } | { ok: false; status: number | null };

async function getJson<T>(url: string, token: string): Promise<SectionResult<T>> {
  try {
    const res = await fetch(url, {
      headers: { "x-analytics-token": token },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    return { ok: true, value: (await res.json()) as T };
  } catch {
    // Network failure (fetch rejected) — distinct from an HTTP error status
    return { ok: false, status: null };
  }
}

/** User-facing message for an analytics section failure, keyed by failure class. */
export function analyticsErrorMessage(status: number | null): string {
  if (status === 401) return "Wrong token.";
  if (status === null || status >= 500) return "Analytics backend unreachable.";
  return `Analytics request failed (${status}).`;
}

export async function fetchAnalytics(token: string): Promise<AnalyticsResult> {
  const result: AnalyticsResult = { summary: null, visits: null, searches: null, errors: {} };

  const [summary, visits, searches] = await Promise.all([
    getJson<AnalyticsData["summary"]>("/api/analytics?kind=summary", token),
    getJson<AnalyticsData["visits"]>("/api/analytics?kind=visits&limit=25", token),
    getJson<AnalyticsData["searches"]>("/api/analytics?kind=searches&limit=25", token),
  ]);

  if (summary.ok) {
    result.summary = summary.value;
  } else {
    result.errors.summary = summary.status;
  }

  if (visits.ok) {
    result.visits = visits.value;
  } else {
    result.errors.visits = visits.status;
  }

  if (searches.ok) {
    result.searches = searches.value;
  } else {
    result.errors.searches = searches.status;
  }

  return result;
}
