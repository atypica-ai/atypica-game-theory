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
      className="inline-flex items-center px-2 py-0.5 text-[11px] border"
      style={{
        borderRadius: "9999px",
        border: "1px solid var(--gt-border-md)",
        color: "var(--gt-t3)",
        fontFamily: "IBMPlexMono, monospace",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2">
        <div className="w-3 h-2.5 rounded-sm opacity-75" style={{ background: "hsl(208 77% 52%)" }} />
        <span className="text-[11px]" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}>
          AI Persona
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-0.5 h-2.5" style={{ background: "hsl(30 8% 75%)" }} />
        <span className="text-[11px] italic" style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif" }}>
          Human Reference
        </span>
      </div>
    </div>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────

function GameCard({ gt }: { gt: GameType }) {
  const horizon = formatHorizon(gt);
  const players = formatPlayers(gt);

  return (
    <div
      className="flex flex-col border"
      style={{
        background: "var(--gt-surface)",
        border: "1px solid var(--gt-border)",
        borderRadius: "0.375rem",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--gt-border)" }}>
        <h2
          className="text-[15px] font-[600] mb-2 leading-tight"
          style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          {gt.displayName}
        </h2>
        <p
          className="text-[12px] mb-3 leading-snug"
          style={{ color: "var(--gt-t2)" }}
        >
          {gt.tagline}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatChip>{players}</StatChip>
          <StatChip>{horizon}</StatChip>
          {gt.discussionRounds > 0 && (
            <StatChip>
              {gt.discussionRounds} discussion {gt.discussionRounds === 1 ? "round" : "rounds"}
            </StatChip>
          )}
        </div>
      </div>

      {/* Distribution area */}
      <div className="flex-1 p-5">
        <GameDistributionView gameType={gt.name} />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GameTheoryHome() {
  const gameTypes = Object.values(gameTypeRegistry) as unknown as GameType[];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 h-[52px] flex items-center justify-between px-8 border-b"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[12px] font-[600]"
            style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            Game Theory Lab
          </span>
          <span className="w-px h-3.5" style={{ background: "var(--gt-border-md)" }} />
          <span className="text-[11px]" style={{ color: "var(--gt-t3)" }}>
            AI vs human behavioral analysis
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Legend />
          <Link
            href="/game/new"
            className="h-8 px-4 text-[12px] font-[500] inline-flex items-center transition-opacity hover:opacity-80"
            style={{
              background: "var(--gt-blue)",
              color: "white",
              borderRadius: "0.375rem",
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          >
            New Experiment →
          </Link>
        </div>
      </header>

      {/* ── Game grid ──────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(560px, 1fr))",
          }}
        >
          {gameTypes.map((gt) => (
            <GameCard key={gt.name} gt={gt} />
          ))}
        </div>
      </main>
    </div>
  );
}
