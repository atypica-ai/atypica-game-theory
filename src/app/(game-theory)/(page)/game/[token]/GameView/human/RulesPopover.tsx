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
      {/* Floating ? button — positioned below phase progress on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-14 sm:top-4 right-4 z-40 group w-7 h-7 flex items-center justify-center rounded-full border cursor-pointer transition-colors text-[var(--gt-t4)] border-[var(--gt-border-md)] bg-[var(--gt-surface)] hover:text-[var(--gt-ink)] hover:border-[var(--gt-ink)] active:scale-90"
        style={{
          fontSize: "12px",
          fontFamily: "IBMPlexMono, monospace",
          fontWeight: 600,
          lineHeight: 1,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        ?
        <span
          className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: "var(--gt-t1)",
            color: "var(--gt-surface)",
            borderRadius: "0.25rem",
            fontFamily: "IBMPlexMono, monospace",
            letterSpacing: "0.02em",
          }}
        >
          Game rules
        </span>
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
