"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Framework, NpmPackage, Priority, SearchState } from "@/types";

const initialState: SearchState = {
  status: "idle",
  packages: [],
  llmText: "",
  errorMessage: null,
};

export function useSearch() {
  const [state, setState] = useState<SearchState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream when the component unmounts so a stale
  // response can never setState on a dead component.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const search = useCallback(
    async (query: string, framework?: Framework, priorities?: Priority[]) => {
      // Supersede any previous stream — a slow earlier response must not
      // overwrite the results of a newer search.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

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
          signal: controller.signal,
        });

        if (!response.ok) {
          let detail: string | null = null;
          try {
            const errBody = await response.json();
            detail = typeof errBody?.detail === "string" ? errBody.detail : null;
          } catch {
            // Non-JSON error body — fall back to a generic message.
          }
          const errorMessage =
            response.status === 429
              ? "Rate limited — too many searches. Wait a moment, then try again."
              : (detail ?? `Server error: ${response.status}`);
          setState((s) => ({ ...s, status: "error", errorMessage }));
          return;
        }

        const reader = response.body!.getReader();
        // stream: true (on decode, not the constructor — Node's util.TextDecoder
        // typing only allows it there) keeps multi-byte UTF-8 characters that
        // straddle two network chunks intact instead of decoding them as U+FFFD.
        const decoder = new TextDecoder("utf-8");

        // SSE events are terminated by a blank line ("\n\n"), not a single
        // "\n". Buffer raw text, split on event boundaries, and keep any
        // trailing partial event for the next read. A data: field may itself
        // span multiple lines within one event.
        let buffer = "";
        let eventName: string | null = null;
        let dataLines: string[] = [];

        const dispatch = () => {
          const name = eventName;
          const data = dataLines.join("\n");
          eventName = null;
          dataLines = [];

          if (data === "[DONE]") {
            setState((s) => ({
              ...s,
              status: packagesReceived ? "done" : "empty",
            }));
            return;
          }

          if (name === "packages") {
            try {
              const packages: NpmPackage[] = JSON.parse(data);
              packagesReceived = true;
              setState((s) => ({ ...s, status: "streaming", packages }));
            } catch {
              // malformed JSON - skip
            }
            return;
          }

          if (name === "error") {
            setState((s) => ({
              ...s,
              status: "error",
              errorMessage: "The AI encountered an error. Please try again.",
            }));
            return;
          }

          // Plain "data:" events carry GPT-4o token chunks.
          if (data) {
            setState((s) => ({
              ...s,
              status: "streaming",
              llmText: s.llmText + data.replace(/\\n/g, "\n"),
            }));
          }
        };

        const processEvent = (rawEvent: string) => {
          for (const rawLine of rawEvent.split("\n")) {
            const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              // Strip "data:" plus one optional leading space (SSE spec).
              dataLines.push(line.slice(5).replace(/^ /, ""));
            }
          }
          dispatch();
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            processEvent(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf("\n\n");
          }
        }

        // Flush the decoder's tail and dispatch any event that ended right at
        // EOF without a trailing blank line (per the SSE spec).
        buffer += decoder.decode();
        if (buffer.length > 0) {
          processEvent(buffer);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Superseded by a newer search or unmounted — leave state alone.
          return;
        }
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

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { state, search, reset };
}
