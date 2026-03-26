"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import chartDataRaw from "./chartData.json";
import { DistributionChart, GameChartData } from "./DistributionChart";

type ChartRegistry = Record<string, GameChartData>;
const chartData = chartDataRaw as ChartRegistry;
const gameKeys = Object.keys(chartData);

// ── Fade-in helper ─────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Live badge ─────────────────────────────────────────────────

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

// ── Game type tab ──────────────────────────────────────────────

function GameTab({
  gameKey,
  label,
  accentColor,
  active,
  onClick,
}: {
  gameKey: string;
  label: string;
  accentColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 transition-colors"
      style={{
        borderBottom: active ? `1px solid ${accentColor}` : "1px solid transparent",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: active ? accentColor : "#3f3f46" }}
      />
      <span
        className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase transition-colors"
        style={{ color: active ? "#e4e4e7" : "#52525b" }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Main homepage ──────────────────────────────────────────────

export function GameTheoryHome() {
  const [activeGame, setActiveGame] = useState(gameKeys[0]);
  const active = chartData[activeGame];

  return (
    <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="shrink-0 h-[52px] flex items-center justify-between px-8 border-b border-white/[0.05]">
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

      {/* ── Body: split ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid gap-px" style={{ gridTemplateColumns: "38% 1fr", backgroundColor: "rgba(255,255,255,0.04)" }}>
        {/* LEFT: identity + intro */}
        <div className="bg-zinc-900 flex flex-col justify-between px-10 py-10 overflow-hidden relative">
          {/* Ghost index watermark */}
          <div
            className="pointer-events-none absolute right-6 bottom-4 font-EuclidCircularA text-[7rem] leading-none select-none"
            style={{ color: "rgba(9,9,11,0.08)", fontWeight: 300 }}
            aria-hidden="true"
          >
            GT
          </div>

          {/* Top content */}
          <div className="flex flex-col gap-6 relative z-10">
            <FadeIn delay={0.1}>
              <span className="font-IBMPlexMono text-[9px] tracking-[0.18em] uppercase text-zinc-600">
                Game Theory Lab
              </span>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="font-EuclidCircularA text-[2.6rem] font-medium leading-[1.05] text-white">
                Does strategy{" "}
                <span className="font-InstrumentSerif italic text-ghost-green">emerge</span>
                {" "}from AI?
              </h1>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
                Run structured game theory experiments with AI personas. See how they cooperate,
                defect, and reason under strategic pressure — compared to decades of human research.
              </p>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="flex items-center gap-5 pt-1">
                {[
                  { value: "12", label: "Experiments" },
                  { value: "8", label: "Personas" },
                  { value: "1", label: "Game type" },
                ].map((stat, i) => (
                  <div key={stat.label} className="flex flex-col gap-0.5">
                    <span
                      className="font-EuclidCircularA text-2xl font-light"
                      style={{ color: i === 0 ? "#1bff1b" : i === 1 ? "#3b82f6" : "#d97706" }}
                    >
                      {stat.value}
                    </span>
                    <span className="font-IBMPlexMono text-[8px] tracking-[0.12em] uppercase text-zinc-600">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Bottom CTAs */}
          <FadeIn delay={0.5} className="relative z-10 flex items-center gap-3">
            <Link
              href="/game/new"
              className="h-10 px-5 bg-ghost-green text-black font-medium text-sm tracking-[0.04em] inline-flex items-center"
            >
              Start Experiment →
            </Link>
            <Link
              href="/game/"
              className="h-10 px-5 border border-zinc-700 text-zinc-300 text-sm tracking-[0.04em] inline-flex items-center"
            >
              View Results
            </Link>
          </FadeIn>
        </div>

        {/* RIGHT: distribution charts */}
        <div className="bg-[#09090b] flex flex-col overflow-hidden">
          {/* Game type tabs */}
          <div className="shrink-0 flex items-center gap-0 border-b border-white/[0.05] px-8">
            {gameKeys.map((key) => (
              <GameTab
                key={key}
                gameKey={key}
                label={chartData[key].displayName}
                accentColor={chartData[key].accentColor}
                active={activeGame === key}
                onClick={() => setActiveGame(key)}
              />
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 min-h-0 px-10 py-8 flex flex-col justify-between overflow-auto">
            {/* Chart header */}
            <div className="flex items-center justify-between mb-5 shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className="h-px w-4 inline-block shrink-0"
                  style={{ backgroundColor: active.accentColor }}
                />
                <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-400">
                  Human vs. AI Persona · Behavior Distribution
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
              <DistributionChart data={active} />
            </div>

            {/* Source attribution */}
            <div className="shrink-0 mt-4 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
              <span className="font-IBMPlexMono text-[8px] tracking-[0.1em] text-zinc-700">
                Human data: {active.humanSource}
              </span>
              <span className="w-px h-3 bg-zinc-800" />
              <span className="font-IBMPlexMono text-[8px] tracking-[0.1em] text-zinc-700">
                Persona data: {active.personaSource}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
