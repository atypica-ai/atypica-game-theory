"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudyShortcut } from "../config/shortcuts";

interface ShortcutCardProps {
  shortcut: StudyShortcut;
  onClick: (description: string) => void;
}

export function ShortcutCard({ shortcut, onClick }: ShortcutCardProps) {
  const handleClick = () => {
    onClick(shortcut.description);
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
      <div className="font-medium text-sm line-clamp-2 shrink-0">{shortcut.title}</div>

      {/* Description */}
      <div className="text-xs text-muted-foreground line-clamp-3 flex-1">{shortcut.description}</div>

      {/* Tags */}
      {shortcut.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-border/50 w-full">
          {shortcut.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </button>
  );
}
