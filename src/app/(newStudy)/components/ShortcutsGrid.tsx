"use client";

import { useLocale } from "next-intl";
import { studyShortcutsEN, studyShortcutsZH } from "../config/shortcuts";
import { ShortcutCard } from "./ShortcutCard";

interface ShortcutsGridProps {
  onShortcutClick: (description: string) => void;
}

export function ShortcutsGrid({ onShortcutClick }: ShortcutsGridProps) {
  const locale = useLocale() as "zh-CN" | "en-US";
  const shortcuts = locale === "zh-CN" ? studyShortcutsZH : studyShortcutsEN;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {shortcuts.map((shortcut) => (
        <ShortcutCard key={shortcut.id} shortcut={shortcut} onClick={onShortcutClick} />
      ))}
    </div>
  );
}
