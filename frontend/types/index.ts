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