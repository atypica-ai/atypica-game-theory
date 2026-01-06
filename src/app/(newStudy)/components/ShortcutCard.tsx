"use client";

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
        "group relative flex flex-col items-start gap-4 p-4 rounded-lg border border-border",
        "bg-background hover:bg-accent/40 hover:border-foreground/20",
        "transition-all duration-300 ease-out",
        "text-left w-full h-full min-h-[200px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      {/* Emoji + Title */}
      <div className="flex items-center gap-2 w-full shrink-0">
        <div className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
          {shortcut.emoji}
        </div>
        <div className="font-semibold text-base leading-snug flex-1">{shortcut.title}</div>
      </div>

      {/* Description */}
      <div className="text-xs leading-relaxed text-muted-foreground flex-1">
        {shortcut.description}
      </div>

      {/* Research Method Flow */}
      {shortcut.tags.length > 0 && (
        <div className="mt-auto pt-3 border-t border-border/40 w-full">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 group-hover:text-muted-foreground/90 transition-colors">
            <span className="shrink-0 opacity-60">🔍</span>
            {shortcut.tags.map((tag, index) => (
              <span key={index} className="flex items-center gap-1.5">
                <span className="whitespace-nowrap font-medium">{tag}</span>
                {index < shortcut.tags.length - 1 && (
                  <span className="text-muted-foreground/40">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
