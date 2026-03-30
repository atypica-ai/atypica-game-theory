"use client";

import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { GameDistributionView } from "./DistributionChart";

// ── Per-game accent colors ────────────────────────────────────────────────────
const GAME_ACCENT: Record<string, string> = {
  "prisoner-dilemma": "#1bff1b",
  "stag-hunt": "#d97706",
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

// ── Main homepage ─────────────────────────────────────────────────────────────
export function GameTheoryHome() {
  const [activeGame, setActiveGame] = useState(gameTypes[0]?.name ?? "prisoner-dilemma");
  const accentColor = GAME_ACCENT[activeGame] ?? "#1bff1b";

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
      <div className="relative px-10 py-7 border-b border-white/[0.05] shrink-0 overflow-hidden">
        {/* GT watermark */}
        <div
          className="pointer-events-none select-none absolute right-8 top-1/2 -translate-y-1/2 font-EuclidCircularA leading-none"
          style={{ fontSize: "6.5rem", color: "rgba(255,255,255,0.025)", fontWeight: 300 }}
          aria-hidden
        >
          GT
        </div>

        <div className="flex items-end justify-between relative z-10">
          {/* Headline + sub-text */}
          <div>
            <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-600 block mb-3">
              Behavioral Divergence Analysis
            </span>
            <h1 className="font-EuclidCircularA text-[1.9rem] font-medium leading-[1.1] text-white mb-2.5">
              Does AI strategy{" "}
              <span className="font-InstrumentSerif italic" style={{ color: "#1bff1b" }}>
                mirror
              </span>{" "}
              human instinct?
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">
              Run structured experiments with AI personas. Compare their strategic distributions
              against decades of human behavioral research.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 shrink-0 mb-0.5">
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

      {/* ── Tab strip + legend ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 border-b border-white/[0.05] shrink-0">
        {/* Game type tabs */}
        <div className="flex items-center">
          {gameTypes.map((gt) => {
            const color = GAME_ACCENT[gt.name] ?? "#1bff1b";
            const isActive = activeGame === gt.name;
            return (
              <button
                key={gt.name}
                onClick={() => setActiveGame(gt.name)}
                className="flex items-center gap-2 px-4 py-3 transition-colors"
                style={{
                  borderBottom: isActive ? `1px solid ${color}` : "1px solid transparent",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                  style={{ backgroundColor: isActive ? color : "#3f3f46" }}
                />
                <span
                  className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase transition-colors"
                  style={{ color: isActive ? "#e4e4e7" : "#52525b" }}
                >
                  {gt.displayName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 pr-2">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-[9px] shrink-0"
              style={{ backgroundColor: accentColor, opacity: 0.65 }}
            />
            <span className="font-IBMPlexMono text-[7px] tracking-[0.1em] uppercase text-zinc-600">
              AI Persona
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-[9px] bg-white/90 shrink-0" />
            <span className="font-InstrumentSerif italic text-[10px] text-zinc-600">
              Human Reference
            </span>
          </div>
        </div>
      </div>

      {/* ── Distribution view ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <GameDistributionView gameType={activeGame} />
      </div>
    </div>
  );
}
