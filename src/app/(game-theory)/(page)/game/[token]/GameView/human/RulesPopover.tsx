"use client";

import { GameRulesDisplay } from "@/app/(game-theory)/components/GameRulesDisplay";
import { useState } from "react";

interface RulesPopoverProps {
  gameTypeName: string;
  gameDisplayName: string;
}

export function RulesPopover({ gameTypeName, gameDisplayName }: RulesPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 cursor-pointer transition-colors"
        style={{
          fontSize: "10px",
          fontFamily: "IBMPlexMono, monospace",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: "var(--gt-t4)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gt-ink)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gt-t4)")}
      >
        RULES
      </button>

      {/* Rules modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "hsl(24 6% 17% / 0.25)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full mx-4 border overflow-hidden flex flex-col"
            style={{
              maxWidth: "640px",
              maxHeight: "80vh",
              background: "var(--gt-surface)",
              borderColor: "var(--gt-border)",
              borderRadius: "0.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "var(--gt-border)" }}
            >
              <span
                className="text-[15px] font-[600]"
                style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
              >
                {gameDisplayName}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--gt-row-alt)]"
                style={{ color: "var(--gt-t3)", fontSize: "16px", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <GameRulesDisplay gameTypeName={gameTypeName} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
