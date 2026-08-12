export interface NpmPackage {
  name: string;
  description: string;
  version: string;
  npm_url: string;
}

export type SearchStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "done"
  | "empty"
  | "error";

export interface SearchState {
  status: SearchStatus;
  packages: NpmPackage[];
  llmText: string;
  errorMessage: string | null;
}

export const FRAMEWORK_OPTIONS = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "node", label: "Node" },
  { value: "none", label: "Any" },
] as const;

export type Framework = (typeof FRAMEWORK_OPTIONS)[number]["value"];

export const PRIORITY_OPTIONS = [
  "bundle size",
  "TypeScript support",
  "actively maintained",
  "minimal dependencies",
  "performance",
  "well documented",
] as const;

export type Priority = (typeof PRIORITY_OPTIONS)[number];

export interface TopItem {
  label: string;
  count: number;
}

export interface AnalyticsSummary {
  total_visits: number;
  unique_visitors: number;
  total_searches: number;
  visits_last_24h: number;
  searches_last_24h: number;
  top_queries: TopItem[];
  top_frameworks: TopItem[];
  top_referrers: TopItem[];
}

export interface PageView {
  visited_at: string;
  ip_hash: string;
  user_agent: string | null;
  referrer: string | null;
}

export interface SearchEvent {
  searched_at: string;
  query: string;
  framework: string | null;
  priorities: string[] | null;
  result_count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  visits: PageView[];
  searches: SearchEvent[];
}