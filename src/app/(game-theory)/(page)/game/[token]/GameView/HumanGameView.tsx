"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";

// Placeholder — Phase 4 will implement this fully.
export function HumanGameView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: "var(--gt-bg)" }}>
      <span className="text-[14px]" style={{ color: "var(--gt-t3)" }}>
        Loading human game view...
      </span>
    </div>
  );
}
