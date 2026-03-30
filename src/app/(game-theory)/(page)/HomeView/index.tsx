"use client";

import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { motion } from "motion/react";
import Link from "next/link";
import { GameDistributionView } from "./DistributionChart";

// ── Per-game accent colors ────────────────────────────────────────────────────
const GAME_ACCENT: Record<string, string> = {
  "prisoner-dilemma": "#1bff1b",
  "stag-hunt": "#d97706",
};

// ── Per-game intro descriptions ───────────────────────────────────────────────
// Plain, readable, no point values. Meant to spark curiosity, not explain rules.
const GAME_DESCRIPTION: Record<string, string> = {
  "prisoner-dilemma":
    "Two players must each choose — cooperate or defect — simultaneously, with no communication and no binding promises. If both cooperate, both benefit. If one defects while the other trusts, the defector wins at their partner's expense. The game repeats across rounds, and the central tension never changes: can mutual trust survive the constant pull of self-interest?",
  "stag-hunt":
    "Each player secretly decides whether to join a group stag hunt or slip away and chase rabbits alone. The hunt only succeeds if enough players commit — but if it does, everyone gets the reward, even those who chose rabbit. You can play it safe with a guaranteed return, or bet on collective action and risk walking away with nothing. The harder question: do you trust the others to show up?",
};

const gameTypes = Object.values(gameTypeRegistry);

// ── Live badge ────────────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 border border-ghost-green/[0.3] bg-zinc-800/80 backdrop-blur-sm px-3 py-1">
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-ghost-green"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="font-IBMPlexMono text-[8px] tracking-[0.17em] uppercase text-ghost-green">
        Live System
      </span>
    </span>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-4 h-[9px] shrink-0 bg-zinc-400" style={{ opacity: 0.65 }} />
        <span className="font-IBMPlexMono text-[8px] tracking-[0.12em] uppercase text-zinc-400">
          AI Persona
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-[3px] h-[9px] bg-white/90 shrink-0" />
        <span className="font-InstrumentSerif italic text-[11px] text-zinc-400">
          Human Reference
        </span>
      </div>
    </div>
  );
}

// ── Game type section header ──────────────────────────────────────────────────
function GameTypeHeader({
  name,
  displayName,
  description,
  accentColor,
}: {
  name: string;
  displayName: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div className="px-10 pt-10 pb-5 flex items-start justify-between gap-12">
      <div className="flex flex-col gap-2 max-w-xl">
        {/* Name row */}
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase"
            style={{ color: accentColor }}
          >
            {name}
          </span>
        </div>
        {/* Display name */}
        <h2 className="font-EuclidCircularA text-xl font-medium text-white leading-tight">
          {displayName}
        </h2>
        {/* Plain readable description */}
        <p className="text-sm text-zinc-400 leading-relaxed">
          {description}
        </p>
      </div>
      {/* Legend — right-aligned, top-aligned */}
      <div className="shrink-0 pt-1">
        <Legend />
      </div>
    </div>
  );
}

// ── Main homepage ─────────────────────────────────────────────────────────────
export function GameTheoryHome() {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-[52px] flex items-center justify-between px-8 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-ghost-green">
            01
          </span>
          <span className="w-px h-3 bg-zinc-800" />
          <span className="font-EuclidCircularA text-sm font-medium text-white">
            Game Theory Lab
          </span>
        </div>
        <LiveBadge />
      </header>

      {/* ── Hero strip ─────────────────────────────────────────────────────── */}
      <div className="relative px-10 py-8 border-b border-white/[0.05] shrink-0 overflow-hidden">
        {/* GT watermark */}
        <div
          className="pointer-events-none select-none absolute right-8 top-1/2 -translate-y-1/2 font-EuclidCircularA leading-none"
          style={{ fontSize: "6.5rem", color: "rgba(255,255,255,0.025)", fontWeight: 300 }}
          aria-hidden
        >
          GT
        </div>

        <div className="flex items-center justify-between relative z-10">
          {/* Headline + sub-text */}
          <div>
            <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-500 block mb-3">
              Behavioral Divergence Analysis
            </span>
            <h1 className="font-EuclidCircularA text-[1.9rem] font-medium leading-[1.1] text-white mb-3">
              Does AI strategy{" "}
              <span className="font-InstrumentSerif italic" style={{ color: "#1bff1b" }}>
                mirror
              </span>{" "}
              human instinct?
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              Each chart compares action probabilities between AI personas and human subjects from
              academic experiments. Colored bars = AI. Thin white lines = humans.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <Link
              href="/game/new"
              className="h-9 px-5 bg-ghost-green text-black font-medium text-xs tracking-[0.05em] inline-flex items-center"
            >
              Run Experiment →
            </Link>
            <Link
              href="/game/"
              className="h-9 px-5 border border-zinc-700 text-zinc-400 text-xs tracking-[0.05em] inline-flex items-center"
            >
              Past Results
            </Link>
          </div>
        </div>
      </div>

      {/* ── Game type sections — flat, in order ────────────────────────────── */}
      {gameTypes.map((gt, i) => {
        const accentColor = GAME_ACCENT[gt.name] ?? "#1bff1b";
        return (
          <section
            key={gt.name}
            className={i > 0 ? "border-t border-white/[0.05]" : undefined}
          >
            <GameTypeHeader
              name={gt.name}
              displayName={gt.displayName}
              description={GAME_DESCRIPTION[gt.name] ?? gt.tagline}
              accentColor={accentColor}
            />
            <GameDistributionView gameType={gt.name} />
          </section>
        );
      })}
    </div>
  );
}
