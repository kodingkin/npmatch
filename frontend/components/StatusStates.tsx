"use client";

import { Card, Button } from "@heroui/react";

interface EmptyStateProps {
  onReset: () => void;
}

export function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <Card className="border border-white/10 bg-white/5 fade-in-up">
      <Card.Content className="flex flex-col items-center py-10 gap-3">
        <span className="text-3xl" aria-hidden="true">📦</span>
        <h2 className="font-mono font-semibold text-white/90">No packages found</h2>
        <p className="text-sm text-white/40 text-center max-w-sm">
          Try rephrasing your query with more specific terms, or remove some filters.
        </p>
        <Button
          variant="outline"
          onPress={onReset}
          className="mt-2 font-mono text-xs border-white/20 text-white/60 hover:border-white/40"
        >
          Try again
        </Button>
      </Card.Content>
    </Card>
  );
}

interface ErrorStateProps {
  message: string;
  onReset: () => void;
}

export function ErrorState({ message, onReset }: ErrorStateProps) {
  return (
    <Card className="border border-npm-red/40 bg-white/5 fade-in-up">
      <Card.Content className="flex flex-row items-center justify-between gap-4 py-3 px-5">
        <div className="flex items-center gap-2">
          <span className="text-npm-red text-lg" aria-hidden="true">⚠</span>
          <p className="font-mono text-sm text-white/40">{message}</p>
        </div>
        <Button
          variant="ghost"
          onPress={onReset}
          className="font-mono text-xs text-npm-red hover:bg-npm-red/10 shrink-0"
        >
          Retry
        </Button>
      </Card.Content>
    </Card>
  );
}