"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, Spinner } from "@heroui/react";
import { analyticsErrorMessage, fetchAnalytics } from "@/lib/analytics";
import type { AnalyticsResult, AnalyticsSummary, PageView, SearchEvent, TopItem } from "@/types";

const TOKEN_KEY = "npmatch.analytics.token";

type Status = "gate" | "loading" | "error" | "done";

export default function AnalyticsPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.sessionStorage.getItem(TOKEN_KEY);
    if (stored) {
      setSavedToken(stored);
    } else {
      setStatus("gate");
    }
  }, []);

  useEffect(() => {
    if (!savedToken) return;
    let cancelled = false;
    setStatus("loading");
    fetchAnalytics(savedToken).then((r) => {
      if (cancelled) return;
      if (r.summary !== null) {
        // Only persist a token that was just validated
        window.sessionStorage.setItem(TOKEN_KEY, savedToken);
        setResult(r);
        setStatus("done");
      } else {
        if (r.errors.summary === 401) {
          window.sessionStorage.removeItem(TOKEN_KEY);
        }
        setError(analyticsErrorMessage(r.errors.summary ?? null));
        setStatus("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [savedToken]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    setSavedToken(trimmed);
  };

  const handleLock = useCallback(() => {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setSavedToken(null);
    setResult(null);
    setToken("");
    setStatus("gate");
  }, []);

  return (
    <>
      <main className="min-h-screen grid-bg">
        <header className="border-b border-white/5 bg-black/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="font-mono font-semibold text-sm text-white/90 tracking-tight no-underline">
                <span className="text-npm-red">npm</span>atch
              </Link>
              <span className="text-white/30 text-xs font-mono">/ analytics</span>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-10">
          {status === "gate" && (
            <form onSubmit={handleUnlock} className="max-w-sm mx-auto pt-24 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="font-mono font-semibold text-lg text-white/90">Analytics</h1>
                <p className="text-sm text-white/40">Enter your analytics token to unlock the dashboard.</p>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Analytics token"
                aria-label="Analytics token"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/90 placeholder:text-white/25 focus:outline-none focus:border-npm-red transition-colors"
              />
              <button
                type="submit"
                disabled={!token.trim()}
                className="font-mono text-sm px-4 py-2 rounded-lg bg-npm-red text-white hover:bg-[#a82e2d] disabled:opacity-40 transition-colors self-end"
              >
                Unlock →
              </button>
            </form>
          )}

          {status === "loading" && (
            <div className="flex items-center justify-center gap-3 pt-24">
              <Spinner size="sm" color="accent" />
              <span className="text-sm font-mono text-white/40">Loading analytics…</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 pt-24 text-center">
              <p className="text-sm font-mono text-white/60">{error}</p>
              <button
                onClick={handleLock}
                className="font-mono text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/60 hover:border-white/30 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {status === "done" && result && result.summary && (
            <Dashboard
              summary={result.summary}
              visits={result.visits}
              searches={result.searches}
              errors={result.errors}
              onLock={handleLock}
            />
          )}
        </div>
      </main>
    </>
  );
}

function Dashboard({
  summary,
  visits,
  searches,
  errors,
  onLock,
}: {
  summary: AnalyticsSummary;
  visits: PageView[] | null;
  searches: SearchEvent[] | null;
  errors: AnalyticsResult["errors"];
  onLock: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono font-semibold text-lg text-white/90">Analytics</h1>
          <p className="text-sm text-white/40">Who visits, and what they search.</p>
        </div>
        <button
          onClick={onLock}
          className="font-mono text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/60 hover:border-white/30 transition-colors"
        >
          Lock
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Visits" value={summary.total_visits} />
        <Stat label="Unique visitors" value={summary.unique_visitors} />
        <Stat label="Searches" value={summary.total_searches} />
        <Stat label="Visits · 24h" value={summary.visits_last_24h} />
        <Stat label="Searches · 24h" value={summary.searches_last_24h} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TopList title="Top queries" items={summary.top_queries} />
        <TopList title="Top frameworks" items={summary.top_frameworks} />
        <TopList title="Top referrers" items={summary.top_referrers} />
      </div>

      <RecentVisits visits={visits} error={analyticsErrorMessage(errors.visits ?? null)} />
      <RecentSearches searches={searches} error={analyticsErrorMessage(errors.searches ?? null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.03] px-4 py-3 flex flex-col gap-1">
      <span className="text-[11px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
      <span className="font-mono text-2xl text-white/90">{value.toLocaleString()}</span>
    </div>
  );
}

function TopList({ title, items }: { title: string; items: TopItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.03] px-4 py-3 flex flex-col gap-2">
      <h3 className="text-[11px] font-mono text-white/30 uppercase tracking-widest">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm font-mono text-white/30">No data yet</p>
      ) : (
        items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-mono text-white/70 truncate">{item.label}</span>
              <span className="text-sm font-mono text-white/40 shrink-0">{item.count}</span>
            </div>
            <div className="h-1 rounded-full bg-white/5">
              <div
                className="h-1 rounded-full bg-npm-red/60"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function RecentVisits({ visits, error }: { visits: PageView[] | null; error: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-mono text-white/30 uppercase tracking-widest">Recent visitors</h2>
      {visits === null ? (
        <div className="border border-white/10 rounded-xl bg-white/[0.03] px-4 py-3 text-sm font-mono text-white/40">
          Failed to load recent visitors — {error}
        </div>
      ) : (
        <div className="border border-white/10 rounded-xl bg-white/[0.03] overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead>
              <tr className="text-white/30 text-xs">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Visitor</th>
                <th className="px-4 py-2 font-medium">Referrer</th>
                <th className="px-4 py-2 font-medium">User agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visits.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-white/30">
                    No visits yet
                  </td>
                </tr>
              )}
              {visits.map((v, i) => (
                <tr key={`${v.visited_at}-${i}`} className="text-white/70">
                  <td className="px-4 py-2 whitespace-nowrap">{formatTime(v.visited_at)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{v.ip_hash.slice(0, 8)}…</td>
                  <td className="px-4 py-2 whitespace-nowrap">{referrerDomain(v.referrer)}</td>
                  <td className="px-4 py-2 truncate max-w-[20rem] text-white/40">{v.user_agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RecentSearches({ searches, error }: { searches: SearchEvent[] | null; error: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-mono text-white/30 uppercase tracking-widest">Recent searches</h2>
      {searches === null ? (
        <div className="border border-white/10 rounded-xl bg-white/[0.03] px-4 py-3 text-sm font-mono text-white/40">
          Failed to load recent searches — {error}
        </div>
      ) : (
        <div className="border border-white/10 rounded-xl bg-white/[0.03] overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead>
              <tr className="text-white/30 text-xs">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Query</th>
                <th className="px-4 py-2 font-medium">Framework</th>
                <th className="px-4 py-2 font-medium">Priorities</th>
                <th className="px-4 py-2 font-medium">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {searches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-white/30">
                    No searches yet
                  </td>
                </tr>
              )}
              {searches.map((s, i) => (
                <tr key={`${s.searched_at}-${i}`} className="text-white/70">
                  <td className="px-4 py-2 whitespace-nowrap">{formatTime(s.searched_at)}</td>
                  <td className="px-4 py-2">{s.query}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{s.framework ?? "any"}</td>
                  <td className="px-4 py-2">{s.priorities?.join(", ") ?? "—"}</td>
                  <td className="px-4 py-2">{s.result_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function referrerDomain(ref: string | null): string {
  if (!ref) return "—";
  try {
    return new URL(ref).hostname;
  } catch {
    return ref;
  }
}
