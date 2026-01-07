"use client";
import type { Locale } from "next-intl";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { generateAIShortcuts } from "../actions";
import { StudyShortcut } from "../config/shortcuts";
import { ShortcutCard } from "./ShortcutCard";

interface ShortcutsGridProps {
  onShortcutClick: (description: string) => void;
}

export function ShortcutsGrid({ onShortcutClick }: ShortcutsGridProps) {
  const locale = useLocale() as Locale;
  const [shortcuts, setShortcuts] = useState<StudyShortcut[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    // Reset shortcuts when locale changes
    setShortcuts([]);
    setIsFetching(true);

    // Generate 12 shortcuts covering all 6 target audiences in one call
    // Product Managers, Marketers, Startup Owners, Creators, Consultants, Influencers
    generateAIShortcuts(locale).then((result) => {
      if (result.success && result.data) {
        setShortcuts(result.data);
      }
      setIsFetching(false);
    });
  }, [locale]);

  // Show loading state when fetching and list is empty
  if (isFetching && shortcuts.length === 0) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-4 p-4 rounded-lg border border-border bg-background min-h-[200px] animate-pulse"
          >
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded" />
              <div className="h-3 bg-muted rounded w-5/6" />
              <div className="h-3 bg-muted rounded w-4/6" />
            </div>
            <div className="h-4 bg-muted rounded w-1/2 mt-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shortcuts.map((shortcut, index) => (
        <ShortcutCard key={index} shortcut={shortcut} onClick={onShortcutClick} />
      ))}
    </div>
  );
}
