"use client";

import { Link, Separator, Spinner } from "@heroui/react";
import { SearchForm } from "@/components/SearchForm";
import { PackageCard, PackageCardSkeleton } from "@/components/PackageCard";
import { LlmPanel } from "@/components/LlmPanel";
import { EmptyState, ErrorState } from "@/components/StatusStates";
import { useSearch } from "@/hooks/useSearch";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { useEffect, useRef } from "react";

const SKELETON_COUNT = 3;

export default function Home() {
  const ok = useHealthCheck();
  const { state, search, reset } = useSearch();
  const { status, packages, llmText, errorMessage } = state;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [llmText, status]);

  const isLoading = status === "loading";
  const isStreaming = status === "streaming";
  const isDone = status === "done";
  const isActive = isLoading || isStreaming || isDone;

  return (
    <main className="min-h-screen grid-bg">
      {/* Top bar */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={"/"} className="font-mono font-semibold text-sm text-white/90 tracking-tight no-underline">
              <span className="text-npm-red">npm</span>atch
            </Link>
            <span className="text-white/30 text-xs font-mono">/ find the right package</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full transition-colors ${
              ok === null ? "bg-yellow-500/80 animate-pulse" :
              ok ? "bg-emerald-500/80 animate-pulse" : "bg-red-500/80 animate-pulse"
            }`} />
            <span className="text-[10px] font-mono text-white/30">
              {ok === null ? "checking…" : ok ? "api ok" : "api down"}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-8 min-h-[97vh]">
        {/* Hero section */}
        <div className="flex flex-col gap-2">
          <h1 className="font-mono font-semibold text-2xl tracking-tight text-white/90">
            What are you trying to build?
          </h1>
          <p className="text-sm text-white/40">
            Describe your use case and get AI-matched npm packages — ranked by fit, not just popularity.
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
                <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                  Matched packages
                </span>
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
                    <PackageCard key={pkg.name} pkg={pkg} index={i} />
                  ))}
                </div>
              )}
            </section>

            {/* LLM recommendation */}
            {(llmText || isStreaming) && packages.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-mono text-white/30 uppercase tracking-widest">
                    AI recommendation
                  </span>
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
              Github
              <Link.Icon />
            </Link>
          </p>
          {isDone && (
            <p className="text-[11px] font-mono text-white/20 text-center">
              Showing top 6 results · Vector similarity search via Qdrant
            </p>
          )}
        </div>
      </div>
    </main>
  );
}