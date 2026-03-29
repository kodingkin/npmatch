"use client";

import { useCallback, useState } from "react";
import type { Framework, NpmPackage, Priority, SearchState } from "@/types";

const initialState: SearchState = {
  status: "idle",
  packages: [],
  llmText: "",
  errorMessage: null,
};

export function useSearch() {
  const [state, setState] = useState<SearchState>(initialState);

  const search = useCallback(
    async (query: string, framework?: Framework, priorities?: Priority[]) => {
      setState({
        status: "loading",
        packages: [],
        llmText: "",
        errorMessage: null,
      });

      let packagesReceived = false;

      try {
        const response = await fetch(`/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            framework: framework === "none" ? undefined : framework,
            priorities: priorities?.length ? priorities : undefined,
          }),
        });

        if (!response.ok) {
          setState((s) => ({
            ...s,
            status: "error",
            errorMessage: `Server error: ${response.status}`,
          }));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let pendingPackagesEvent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("event: packages")) {
              pendingPackagesEvent = true;
            } else if (pendingPackagesEvent && line.startsWith("data: ")) {
              try {
                const packages: NpmPackage[] = JSON.parse(line.slice(6));
                packagesReceived = true;
                pendingPackagesEvent = false;
                setState((s) => ({
                  ...s,
                  status: "streaming",
                  packages,
                }));
              } catch {
                // malformed JSON — skip
              }
            } else if (line.startsWith("event: error")) {
              setState((s) => ({
                ...s,
                status: "error",
                errorMessage: "The AI encountered an error. Please try again.",
              }));
            } else if (line.startsWith("data: [DONE]")) {
              setState((s) => ({
                ...s,
                status: packagesReceived ? "done" : "empty",
              }));
            } else if (line.startsWith("data: ")) {
              const chunk = line.slice(6);
              setState((s) => ({
                ...s,
                status: "streaming",
                llmText: s.llmText + chunk,
              }));
            }
          }
        }
      } catch (err) {
        console.error(err);
        setState((s) => ({
          ...s,
          status: "error",
          errorMessage: "Could not reach the server. Is the backend running?",
        }));
      }
    },
    []
  );

  const reset = useCallback(() => setState(initialState), []);

  return { state, search, reset };
}