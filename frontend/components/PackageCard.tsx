"use client";

import { Card, Chip } from "@heroui/react";
import type { NpmPackage } from "@/types";

interface PackageCardProps {
  pkg: NpmPackage;
  index: number;
  highlighted?: boolean;
}

export function PackageCard({ pkg, index, highlighted }: PackageCardProps) {
  return (
    <a
      href={pkg.npm_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block cursor-pointer h-full"
    >
      <Card
        className={[
          "border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "hover:scale-105 hover:shadow-lg fade-in-up h-full",
          highlighted
            ? "border-npm-red/40 bg-npm-red/5 shadow-[0_0_12px_rgba(203,56,55,0.1)] hover:border-npm-red/60 hover:shadow-[0_0_20px_rgba(203,56,55,0.2)] hover:bg-npm-red/10"
            : "border-white/10 bg-white/5 hover:border-npm-red/40 hover:shadow-black/40 hover:bg-white/10",
        ].join(" ")}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <Card.Header className="flex-row items-start justify-between gap-2 pb-1">
          <Card.Title className="font-mono font-semibold text-sm text-white/90 leading-snug">
            {pkg.name}
          </Card.Title>
          <div className="flex items-center gap-1.5 shrink-0">
            {highlighted && (
              <Chip
                size="sm"
                className="bg-npm-red/20 border border-npm-red/30 font-mono text-[10px] text-npm-red/80 shrink-0"
              >
                AI pick
              </Chip>
            )}
            <Chip
              size="sm"
              className="bg-white/10 border border-white/10 font-mono text-[10px] text-white/50 shrink-0"
            >
              v{pkg.version}
            </Chip>
          </div>
        </Card.Header>
        <Card.Content className="py-1">
          <p className="text-xs text-white/40 leading-relaxed line-clamp-3">
            {pkg.description}
          </p>
        </Card.Content>
      </Card>
    </a>
  );
}

/* ---- Skeleton version ---- */

export function PackageCardSkeleton({ index }: { index: number }) {
  return (
    <Card
      className="border border-white/10 bg-white/5 h-full"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <Card.Header className="flex-row items-start justify-between gap-2 pb-1">
        <div className="skeleton-shimmer h-4 w-32 rounded" />
        <div className="skeleton-shimmer h-4 w-12 rounded" />
      </Card.Header>
      <Card.Content className="py-1 flex flex-col gap-1.5">
        <div className="skeleton-shimmer h-3 w-full rounded" />
        <div className="skeleton-shimmer h-3 w-4/5 rounded" />
        <div className="skeleton-shimmer h-3 w-3/5 rounded" />
      </Card.Content>
      <Card.Footer className="pt-1">
        <div className="skeleton-shimmer h-3 w-8 rounded" />
      </Card.Footer>
    </Card>
  );
}