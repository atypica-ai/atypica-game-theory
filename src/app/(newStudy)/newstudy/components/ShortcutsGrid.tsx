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

  useEffect(() => {
    // Reset shortcuts when locale changes
    setShortcuts([]);

    // Fetch 3 batches in parallel for faster results
    // Each batch generates 4 shortcuts, total 12
    const batches: Array<1 | 2 | 3> = [1, 2, 3];

    batches.forEach((batch) => {
      generateAIShortcuts(batch, locale).then((result) => {
        if (result.success && result.data) {
          setShortcuts((prev) => [...prev, ...result.data]);
        }
      });
    });
  }, [locale]);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shortcuts.map((shortcut, index) => (
        <ShortcutCard key={index} shortcut={shortcut} onClick={onShortcutClick} />
      ))}
    </div>
  );
}
