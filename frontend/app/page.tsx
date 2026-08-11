"use client";

import { Link, Separator, Spinner } from "@heroui/react";
import { SearchForm } from "@/components/SearchForm";
import { PackageCard, PackageCardSkeleton } from "@/components/PackageCard";
import { LlmPanel } from "@/components/LlmPanel";
import { EmptyState, ErrorState } from "@/components/StatusStates";
import { useSearch } from "@/hooks/useSearch";
import { useEffect, useMemo, useRef } from "react";

const SKELETON_COUNT = 3;

export default function Home() {
  const { state, search, reset } = useSearch();
  const { status, packages, llmText, errorMessage } = state;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  }, [llmText, status]);

  const isLoading = status === "loading";
  const isStreaming = status === "streaming";
  const isDone = status === "done";
  const isActive = isLoading || isStreaming || isDone;

  const recommendedNames = useMemo(() => {
    if (!isDone || !llmText || packages.length === 0) return new Set<string>();
    const names = new Set<string>();
    // Primary: match all `### package-name` headers (AI picks up to 3).
    // Strip trailing punctuation LLMs append after headings (e.g. `### zod.`)
    // so the captured name still matches the registry name.
    for (const m of llmText.matchAll(/###\s+(\S+)/g)) {
      const name = m[1].replace(/[.,;:!?)]+$/, "").toLowerCase();
      if (name) names.add(name);
    }
    if (names.size > 0) return names;
    // Fallback: find package names mentioned in the text.
    // Match each name as a whole token so `react` doesn't highlight
    // `preact`, `react-router`, or `react-dom`.
    const lower = llmText.toLowerCase();
    for (const pkg of packages) {
      const name = pkg.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|[^\\w.-])${name}($|[^\\w.-])`);
      if (re.test(lower)) names.add(pkg.name);
    }
    return names;
  }, [isDone, llmText, packages]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-black focus:text-white focus:border focus:border-white/20 focus:font-mono focus:text-sm"
      >
        Skip to content
      </a>
      <main id="main" className="min-h-screen grid-bg scroll-mt-12">
      {/* Top bar */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={"/"} className="font-mono font-semibold text-sm text-white/90 tracking-tight no-underline">
              <span className="text-npm-red">npm</span>atch
            </Link>
            <span className="text-white/30 text-xs font-mono">/ find the right package</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-8 min-h-[97vh]">
        {/* Hero section */}
        <div className="flex flex-col gap-2">
          <h1 className="font-mono font-semibold text-2xl tracking-tight text-white/90">
            Tell us what you need
          </h1>
          <p className="text-sm text-white/40">
            AI-matched packages — ranked by fit, not popularity.
          </p>
        </div>

        {/* Search form */}
        <SearchForm onSearch={search} isLoading={isLoading || isStreaming} />

        {/* Results area */}
        {isActive && (
          <div className="flex flex-col gap-6">
            <Separator className="bg-white/5" />

            {/* Package cards */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-widest">
                  Matched packages
                </h2>
                {isLoading && <Spinner size="sm" color="accent" />}
              </div>

              {/* Skeletons while waiting */}
              {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <PackageCardSkeleton key={i} index={i} />
                  ))}
                </div>
              )}

              {/* Real cards */}
              {packages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {packages.map((pkg, i) => (
                    <PackageCard key={pkg.name} pkg={pkg} index={i} highlighted={recommendedNames.has(pkg.name)} />
                  ))}
                </div>
              )}
            </section>

            {/* LLM recommendation */}
            {(llmText || isStreaming) && packages.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xs font-mono text-white/30 uppercase tracking-widest">
                    AI recommendation
                  </h2>
                  {isStreaming && <Spinner size="sm" color="accent" />}
                </div>
                <LlmPanel text={llmText} isStreaming={isStreaming} />
                <div ref={bottomRef} />
              </section>
            )}
          </div>
        )}

        {/* Empty state */}
        {status === "empty" && (
          <div className="flex flex-col gap-4">
            <Separator className="bg-white/5" />
            <EmptyState onReset={reset} />
          </div>
        )}

        {/* Error state */}
        {status === "error" && errorMessage && (
          <div className="flex flex-col gap-4">
            <Separator className="bg-white/5" />
            <ErrorState message={errorMessage} onReset={reset} />
          </div>
        )}

        <div className="mt-auto">
          <p className="text-[11px] font-mono text-white/60 text-center">
            <Link
              href="https://github.com/kodingkin/npmatch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white/80 transition-colors no-underline"
            >
              GitHub
              <Link.Icon />
            </Link>
          </p>
          {isDone && (
            <p className="text-[11px] font-mono text-white/20 text-center">
              Showing top {packages.length} results · Vector similarity search via Qdrant
            </p>
          )}
        </div>
      </div>
      </main>
    </>
  );
}