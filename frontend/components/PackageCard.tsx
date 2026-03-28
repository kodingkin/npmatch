"use client";

import { Card, Chip, Link } from "@heroui/react";
import type { NpmPackage } from "@/types";

interface PackageCardProps {
  pkg: NpmPackage;
  index: number;
}

export function PackageCard({ pkg, index }: PackageCardProps) {
  return (
    <Card
      className="border border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/40 transition-all duration-200 fade-in-up bg-white/5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Card.Header className="flex-row items-start justify-between gap-2 pb-1">
        <Card.Title className="font-mono font-semibold text-sm text-white/90 leading-snug">
          {pkg.name}
        </Card.Title>
        <Chip
          size="sm"
          className="bg-white/10 border border-white/10 font-mono text-[10px] text-white/50 shrink-0"
        >
          v{pkg.version}
        </Chip>
      </Card.Header>
      <Card.Content className="py-1">
        <p className="text-xs text-white/40 leading-relaxed line-clamp-3">
          {pkg.description}
        </p>
      </Card.Content>
      <Card.Footer className="pt-1">
        <Link
          href={pkg.npm_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-npm-red text-xs font-mono hover:text-[#e04544] flex items-center gap-1"
        >
          npm
          <Link.Icon>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.5 3C3.5 2.72386 3.72386 2.5 4 2.5H9C9.27614 2.5 9.5 2.72386 9.5 3V8C9.5 8.27614 9.27614 8.5 9 8.5C8.72386 8.5 8.5 8.27614 8.5 8V4.20711L3.35355 9.35355C3.15829 9.54882 2.84171 9.54882 2.64645 9.35355C2.45118 9.15829 2.45118 8.84171 2.64645 8.64645L7.79289 3.5H4C3.72386 3.5 3.5 3.27614 3.5 3Z" fill="currentColor"/>
            </svg>
          </Link.Icon>
        </Link>
      </Card.Footer>
    </Card>
  );
}

/* ---- Skeleton version ---- */

export function PackageCardSkeleton({ index }: { index: number }) {
  return (
    <Card
      className="border border-white/10 bg-white/5"
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