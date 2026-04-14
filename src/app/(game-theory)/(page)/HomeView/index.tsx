"use client";

import { GameRulesDisplay } from "@/app/(game-theory)/components/GameRulesDisplay";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameType } from "@/app/(game-theory)/gameTypes/types";
import type { StatsData } from "@/app/(game-theory)/lib/stats/types";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { GameDistributionView } from "./DistributionChart";
import { NavBar } from "../components/NavBar";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHorizon(gt: GameType): string {
  if (gt.horizon.type === "fixed") return `${gt.horizon.rounds} rounds`;
  if (gt.horizon.type === "indefinite") return `δ=${gt.horizon.discountFactor}`;
  return "condition-based";
}

function formatPlayers(gt: GameType): string {
  return gt.minPlayers === gt.maxPlayers
    ? `${gt.minPlayers} players`
    : `${gt.minPlayers}–${gt.maxPlayers} players`;
}

// ── Rules hint (hover popover) ───────────────────────────────────────────────

function RulesHint({ gameTypeName }: { gameTypeName: string }) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => { if (timeout.current) clearTimeout(timeout.current); setOpen(true); };
  const hide = () => { timeout.current = setTimeout(() => setOpen(false), 120); };

  return (
    <span className="relative inline-flex items-center" onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-6 h-6 flex items-center justify-center rounded-full border cursor-pointer transition-colors shrink-0"
        style={{
          fontSize: "13px",
          fontFamily: "IBMPlexMono, monospace",
          fontWeight: 600,
          lineHeight: 1,
          color: open ? "var(--gt-ink)" : "var(--gt-t4)",
          borderColor: open ? "var(--gt-ink)" : "var(--gt-border-md)",
          background: "var(--gt-surface)",
        }}
      >
        ?
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 border overflow-y-auto"
          style={{
            width: "min(400px, 80vw)",
            maxHeight: "60vh",
            background: "var(--gt-surface)",
            borderColor: "var(--gt-border)",
            borderRadius: "0.5rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="px-5 py-4">
            <GameRulesDisplay gameTypeName={gameTypeName} />
          </div>
        </div>
      )}
    </span>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 text-[12px]"
      style={{
        borderRadius: "9999px",
        border: "1px solid var(--gt-border-md)",
        color: "var(--gt-t3)",
        fontFamily: "IBMPlexMono, monospace",
        letterSpacing: "0.03em",
      }}
    >
      {children}
    </span>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3 rounded-sm opacity-75" style={{ background: "hsl(208 77% 52%)" }} />
        <span className="text-[12px]" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}>
          AI Persona
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-[3px] h-3" style={{ background: "hsl(30 8% 75%)" }} />
        <span className="text-[12px] italic" style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif" }}>
          Human Reference
        </span>
      </div>
    </div>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────

function GameCard({ gt, sessionCount, aggregateData }: { gt: GameType; sessionCount: number; aggregateData?: StatsData }) {
  const horizon = formatHorizon(gt);
  const players = formatPlayers(gt);

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--gt-surface)",
        border: "1px solid var(--gt-border)",
        borderRadius: "0.5rem",
        overflow: "hidden",
      }}
    >
      {/* Card header — generous padding, large text */}
      <div className="px-5 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6 border-b" style={{ borderColor: "var(--gt-border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <h2
            className="text-[22px] font-[600] leading-tight"
            style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {gt.displayName}
          </h2>
          <RulesHint gameTypeName={gt.name} />
        </div>
        <p
          className="text-[14px] mb-5 leading-relaxed"
          style={{ color: "var(--gt-t2)" }}
        >
          {gt.punchline}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <StatChip>{players}</StatChip>
          <StatChip>{horizon}</StatChip>
          {gt.discussionRounds > 0 && (
            <StatChip>
              {gt.discussionRounds} discussion {gt.discussionRounds === 1 ? "round" : "rounds"}
            </StatChip>
          )}
        </div>
      </div>

      {/* Distribution charts — comfortable breathing room */}
      <div className="px-5 py-4 sm:px-8 sm:py-6">
        <GameDistributionView gameType={gt.name} aggregateData={aggregateData} />
      </div>

      {/* Past games footer */}
      <div
        className="px-5 py-3 sm:px-8 sm:py-4 border-t flex items-center justify-between"
        style={{ borderColor: "var(--gt-border)" }}
      >
        <span
          className="text-[12px]"
          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
        >
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"} recorded
        </span>
        <Link
          href="/games"
          className="text-[13px] font-[500] transition-opacity hover:opacity-70"
          style={{ color: "var(--gt-blue)", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          Past games →
        </Link>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GameTheoryHome({ sessionCounts, distributionStats }: { sessionCounts: Record<string, number>; distributionStats: Record<string, StatsData> }) {
  const gameTypes = Object.values(gameTypeRegistry) as unknown as GameType[];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>

      <NavBar />

      {/* ── Game grid — centered, max-width, generous breathing room ────── */}
      <main className="flex-1 py-8 px-4 sm:py-12 sm:px-8">
        <div className="mx-auto mb-8" style={{ maxWidth: "1200px" }}>
          <Legend />
        </div>
        <div
          className="mx-auto grid gap-6 sm:gap-8"
          style={{
            maxWidth: "1200px",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 520px), 1fr))",
          }}
        >
          {gameTypes.map((gt) => (
            <GameCard key={gt.name} gt={gt} sessionCount={sessionCounts[gt.name] ?? 0} aggregateData={distributionStats[`distribution:${gt.name}`]} />
          ))}
        </div>
      </main>
    </div>
  );
}
