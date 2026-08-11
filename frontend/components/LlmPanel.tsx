"use client";

import ReactMarkdown from "react-markdown";
import { Card, Spinner } from "@heroui/react";

interface LlmPanelProps {
  text: string;
  isStreaming: boolean;
}

export function LlmPanel({ text, isStreaming }: LlmPanelProps) {
  if (!text && isStreaming) {
    return (
      <Card className="border border-white/10 bg-white/5 fade-in-up">
        <Card.Content className="flex flex-row items-center gap-3 py-4">
          <Spinner size="sm" color="accent" />
          <span className="font-mono text-xs text-white/40">
            Generating recommendation…
          </span>
        </Card.Content>
      </Card>
    );
  }

  if (!text) return null;

  return (
    <Card className="border border-white/10 bg-white/5 fade-in-up">
      <Card.Content className="px-6 py-5">
        <div className={`prose-npm ${isStreaming ? "cursor-blink" : ""}`} aria-live="polite">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </Card.Content>
    </Card>
  );
}