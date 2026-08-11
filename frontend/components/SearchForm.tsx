"use client";

import { useState } from "react";
import {
  Button,
  TextField,
  TextArea,
  Select,
  Label,
  ListBox,
  Chip,
  Spinner,
} from "@heroui/react";
import type { Framework, Priority } from "@/types";
import { FRAMEWORK_OPTIONS, PRIORITY_OPTIONS } from "@/types";

interface SearchFormProps {
  onSearch: (query: string, framework?: Framework, priorities?: Priority[]) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState<Framework>("none");
  const [priorities, setPriorities] = useState<Set<Priority>>(new Set());

  const togglePriority = (p: Priority) => {
    if (isLoading) return;
    setPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSearch(trimmed, framework, [...priorities] as Priority[]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Main textarea */}
      <TextField isDisabled={isLoading} className="w-full">
        <TextArea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you need… e.g. 'a lightweight date formatting library with tree-shaking support'"
          rows={3}
          className={[
            "w-full min-h-20 max-h-40 resize-none",
            "bg-white/5 border border-white/10 rounded-xl",
            "px-4 py-3 text-sm font-mono text-white/90",
            "placeholder:text-white/25",
            "focus:outline-none focus:border-npm-red focus:ring-0",
            "hover:border-white/20",
            "transition-colors duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        />
      </TextField>

      {/* Options row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Framework selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono whitespace-nowrap">Framework</span>
          <Select
            defaultSelectedKey="none"
            onSelectionChange={(key) => setFramework((key as Framework) ?? "none")}
            isDisabled={isLoading}
            className="w-27.5"
          >
            <Label className="sr-only">Framework</Label>
            <Select.Trigger className="h-8 px-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 focus:border-npm-red transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:shadow-lg hover:shadow-black/40 hover:bg-white/10">
              <Select.Value className="text-xs font-mono text-white/70" />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="bg-[#111] border border-white/10 rounded-lg">
              <ListBox className="p-1">
                {FRAMEWORK_OPTIONS.map((f) => (
                  <ListBox.Item
                    key={f.value}
                    id={f.value}
                    textValue={f.label}
                    className="text-xs font-mono px-3 py-1.5 rounded cursor-pointer text-white/70 hover:bg-white/10 focus:bg-white/10 outline-none"
                  >
                    {f.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Priority chips */}
        <div className="flex flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((p) => (
            <Chip
              key={p}
              size="sm"
              variant={priorities.has(p) ? "primary" : "secondary"}
              onClick={() => togglePriority(p)}
              className={[
                "cursor-pointer font-mono text-xs",
                "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                "hover:scale-105 hover:shadow-lg hover:shadow-black/40",
                isLoading ? "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none" : "",
                priorities.has(p)
                  ? "bg-npm-red border-npm-red text-white"
                  : "border-white/15 text-white/50 hover:border-white/30",
              ].join(" ")}
            >
              {p}
            </Chip>
          ))}
        </div>
      </div>

      {/* Submit row – button stays right */}
      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          onPress={handleSubmit}
          isDisabled={!query.trim() || isLoading}
          isPending={isLoading}
          className="font-mono text-sm font-medium px-6 bg-npm-red text-white hover:bg-[#a82e2d] disabled:opacity-40 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:shadow-lg hover:shadow-black/40"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="current" />
              Searching…
            </span>
          ) : (
            "Search →"
          )}
        </Button>
      </div>
    </div>
  );
}