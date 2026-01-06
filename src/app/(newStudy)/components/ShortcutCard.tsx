"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Locale } from "next-intl";
import type { StudyShortcut } from "../config/shortcuts";

interface ShortcutCardProps {
  shortcut: StudyShortcut;
  locale: Locale;
  onClick: (description: string) => void;
}

// Helper function to filter tags by locale
function filterTagsByLocale(tags: string[], locale: Locale): string[] {
  const isChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str);

  return tags.filter((tag) => {
    if (locale === "zh-CN") {
      return isChinese(tag);
    } else {
      return !isChinese(tag);
    }
  });
}

export function ShortcutCard({ shortcut, locale, onClick }: ShortcutCardProps) {
  const title = locale === "zh-CN" ? shortcut.title.zh : shortcut.title.en;
  const description = locale === "zh-CN" ? shortcut.description.zh : shortcut.description.en;
  const filteredTags = filterTagsByLocale(shortcut.tags, locale);

  const handleClick = () => {
    onClick(description);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col items-start gap-3 p-4 rounded-lg border border-border",
        "bg-background hover:bg-accent/50 hover:scale-[1.02]",
        "shadow-sm hover:shadow-lg transition-all duration-200",
        "text-left w-full h-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      {/* Emoji */}
      <div className="text-3xl">{shortcut.emoji}</div>

      {/* Title */}
      <div className="font-medium text-sm line-clamp-2 shrink-0">{title}</div>

      {/* Description */}
      <div className="text-xs text-muted-foreground line-clamp-3 flex-1">{description}</div>

      {/* Tags */}
      {filteredTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-border/50 w-full">
          {filteredTags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </button>
  );
}
