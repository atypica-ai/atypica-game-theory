"use client";

import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameType } from "@/app/(game-theory)/gameTypes/types";
import Link from "next/link";
import type { ReactNode } from "react";
import { GameDistributionView } from "./DistributionChart";

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

function GameCard({ gt, sessionCount }: { gt: GameType; sessionCount: number }) {
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
      <div className="px-8 pt-8 pb-6 border-b" style={{ borderColor: "var(--gt-border)" }}>
        <h2
          className="text-[22px] font-[600] mb-3 leading-tight"
          style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          {gt.displayName}
        </h2>
        <p
          className="text-[14px] mb-5 leading-relaxed"
          style={{ color: "var(--gt-t2)" }}
        >
          {gt.tagline}
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
      <div className="px-8 py-6">
        <GameDistributionView gameType={gt.name} />
      </div>

      {/* Past games footer */}
      <div
        className="px-8 py-4 border-t flex items-center justify-between"
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

export function GameTheoryHome({ sessionCounts }: { sessionCounts: Record<string, number> }) {
  const gameTypes = Object.values(gameTypeRegistry) as unknown as GameType[];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>

      {/* ── Header — full width strip, content centered ─────────────────── */}
      <header
        className="shrink-0 border-b"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div
          className="mx-auto flex items-center justify-between h-[60px] px-8"
          style={{ maxWidth: "1200px" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[15px] font-[600]"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              Game Theory Lab
            </span>
            <span className="w-px h-4" style={{ background: "var(--gt-border-md)" }} />
            <span className="text-[13px]" style={{ color: "var(--gt-t3)" }}>
              AI vs human behavioral analysis
            </span>
          </div>

          <Legend />
        </div>
      </header>

      {/* ── Game grid — centered, max-width, generous breathing room ────── */}
      <main className="flex-1 py-12 px-8">
        <div
          className="mx-auto grid gap-8"
          style={{
            maxWidth: "1200px",
            gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))",
          }}
        >
          {gameTypes.map((gt) => (
            <GameCard key={gt.name} gt={gt} sessionCount={sessionCounts[gt.name] ?? 0} />
          ))}
        </div>
      </main>
    </div>
  );
}
