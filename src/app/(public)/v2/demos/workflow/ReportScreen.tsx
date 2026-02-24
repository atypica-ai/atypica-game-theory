"use client";

import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { L } from "../theme";

type ReportVariant =
  | "insight"
  | "verdict"
  | "concept"
  | "journey"
  | "pricing"
  | "paper"
  | "dashboard"
  | "default";

export type StatItem = { label: string; value: string };

export default function ReportScreen({
  title,
  finding,
  stats,
  variant = "default",
}: {
  title: string;
  finding: string;
  stats: StatItem[];
  variant?: ReportVariant;
}) {
  const accent = L.green;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 1500);
    return () => clearTimeout(timer);
  }, [title]);

  const p: RP = { scrollRef, title, finding, stats, accent };
  switch (variant) {
    case "insight":
      return <InsightReport {...p} />;
    case "verdict":
      return <VerdictReport {...p} />;
    case "concept":
      return <ConceptReport {...p} />;
    case "journey":
      return <JourneyReport {...p} />;
    case "pricing":
      return <PricingReport {...p} />;
    case "paper":
      return <PaperReport {...p} />;
    case "dashboard":
      return <DashboardReport {...p} />;
    default:
      return <InsightReport {...p} />;
  }
}

type RP = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  finding: string;
  stats: StatItem[];
  accent: string;
};

/* ═══════════════════════════════════════════════
   1. Insight — Editorial Magazine with Pull Quotes
   Matches "insights" prompt: user quotes dominate as oversized pull quotes
   ═══════════════════════════════════════════════ */
function InsightReport({ scrollRef, title, finding, stats, accent }: RP) {
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: accent }}
        >
          Insight Report
        </span>
        <h3 className="text-base font-medium mt-1" style={{ color: L.text }}>
          {title}
        </h3>
      </div>

      {/* Pull quote — the signature visual element */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-5 py-4 px-4 mb-3"
        style={{ background: `${accent}05`, borderLeft: `3px solid ${accent}` }}
      >
        <p className="text-base leading-relaxed italic" style={{ color: L.text }}>
          &ldquo;{finding}&rdquo;
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-5 pb-3 grid grid-cols-3 gap-2"
      >
        {stats.map((s, i) => (
          <div key={i} className="text-center py-2">
            <span className="text-lg font-medium block" style={{ color: L.text }}>
              {s.value}
            </span>
            <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>
              {s.label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Podcast */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-5 pb-5"
      >
        <PodcastBar accent={accent} />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   2. Verdict — Split-Screen Comparison (A vs B)
   Matches "testing" prompt: side-by-side comparison layout
   ═══════════════════════════════════════════════ */
function VerdictReport({ scrollRef, title, finding, stats, accent }: RP) {
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="max-w-[320px] mx-auto p-5 space-y-3">
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: accent }}
        >
          Concept Test
        </span>
        <h3 className="text-base font-medium" style={{ color: L.text }}>
          {title}
        </h3>

        {/* Split comparison — the signature visual */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-px"
          style={{ background: L.border }}
        >
          <div className="p-3 space-y-1.5" style={{ background: L.bg }}>
            <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>
              Positive
            </span>
            <span className="text-lg font-medium block" style={{ color: accent }}>
              {stats[0]?.value}
            </span>
            <span className="text-xs" style={{ color: L.textMuted }}>
              {stats[0]?.label}
            </span>
          </div>
          <div className="p-3 space-y-1.5" style={{ background: L.bg }}>
            <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>
              Barrier
            </span>
            <span className="text-lg font-medium block" style={{ color: "#dc2626" }}>
              {stats[2]?.value}
            </span>
            <span className="text-xs" style={{ color: L.textMuted }}>
              {stats[2]?.label}
            </span>
          </div>
        </motion.div>

        {/* Winner highlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="py-2 px-3 rounded text-center"
          style={{ background: `${accent}06`, border: `1px solid ${accent}20` }}
        >
          <span className="text-sm font-medium" style={{ color: accent }}>
            WTP: {stats[1]?.value}
          </span>
        </motion.div>

        {/* Finding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-sm leading-relaxed"
          style={{ color: L.textMuted, borderLeft: `2px solid ${accent}40`, paddingLeft: 12 }}
        >
          {finding}
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   3. Concept — Pitch Deck Heroes
   Matches "productRnD" prompt: full-width hero sections, text-5xl data, 16:9 PPT style
   ═══════════════════════════════════════════════ */
function ConceptReport({ scrollRef, title, finding, stats, accent }: RP) {
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {/* Full-bleed hero (PPT slide feel) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="px-5 py-6"
        style={{ background: `linear-gradient(135deg, ${L.text}06, ${accent}04)` }}
      >
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: accent }}
        >
          Product Innovation
        </span>
        <h3 className="text-lg font-medium leading-tight mt-1" style={{ color: L.text }}>
          {title}
        </h3>
      </motion.div>

      {/* Big data number — signature of pitch deck style */}
      {stats[0] && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="px-5 py-3 text-center"
        >
          <span className="text-3xl font-medium" style={{ color: accent }}>
            {stats[0].value}
          </span>
          <span className="text-sm block mt-0.5" style={{ color: L.textMuted }}>
            {stats[0].label}
          </span>
        </motion.div>
      )}

      {/* Innovation flow */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-5 pb-3"
      >
        <div className="flex items-center gap-1.5 text-xs" style={{ color: L.textMuted }}>
          <span className="px-2 py-1 rounded" style={{ background: `${accent}08`, color: accent }}>
            Product
          </span>
          <span>→</span>
          <span className="px-2 py-1 rounded" style={{ background: L.bgSub }}>
            Scout
          </span>
          <span>→</span>
          <span className="px-2 py-1 rounded" style={{ background: L.bgSub }}>
            Inspiration
          </span>
          <span>→</span>
          <span
            className="px-2 py-1 rounded font-medium"
            style={{ background: `${accent}08`, color: accent }}
          >
            Concept
          </span>
        </div>
      </motion.div>

      {/* Brief */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mx-5 p-3 rounded-lg mb-4"
        style={{ background: "white", border: `1px solid ${L.borderLight}` }}
      >
        <p className="text-sm leading-relaxed" style={{ color: L.text }}>
          {finding}
        </p>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   4. Journey — Timeline Spine (Planning-style)
   Matches "planning" prompt: vertical timeline as visual backbone
   ═══════════════════════════════════════════════ */
function JourneyReport({ scrollRef, title, finding, stats, accent }: RP) {
  const stages = ["Discover", "Consider", "Purchase", "Post"];
  const painIndex = 2;
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
      <div className="max-w-[300px] mx-auto space-y-3">
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: accent }}
        >
          VOC Journey
        </span>
        <h3 className="text-base font-medium" style={{ color: L.text }}>
          {title}
        </h3>

        {/* Vertical timeline spine — the signature visual */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-0"
        >
          {stages.map((stage, i) => {
            const isPain = i === painIndex;
            const nodeColor = isPain ? "#dc2626" : accent;
            return (
              <div key={stage} className="flex items-start gap-3">
                {/* Spine */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: nodeColor, opacity: isPain ? 1 : 0.6 }}
                  />
                  {i < stages.length - 1 && (
                    <div className="w-px h-8" style={{ background: L.border }} />
                  )}
                </div>
                {/* Content */}
                <div className="pb-2 -mt-0.5">
                  <span
                    className="text-sm font-medium"
                    style={{ color: isPain ? "#dc2626" : L.text }}
                  >
                    {stage}
                  </span>
                  {isPain && (
                    <span className="text-xs block mt-0.5" style={{ color: "#dc2626" }}>
                      ⚠ Drop-off point
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-2"
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="py-2 px-2 rounded text-center"
              style={{ background: "white", border: `1px solid ${L.borderLight}` }}
            >
              <span
                className="text-sm font-medium block"
                style={{ color: i === 0 ? "#dc2626" : L.text }}
              >
                {s.value}
              </span>
              <span className="text-xs" style={{ color: L.textFaint }}>
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Finding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-sm leading-relaxed"
          style={{ color: L.textMuted, borderLeft: `2px solid ${accent}40`, paddingLeft: 12 }}
        >
          {finding}
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   5. Pricing — Split-Screen Comparison + Tier Cards
   Matches "testing" prompt: A vs B side-by-side, winner highlight
   ═══════════════════════════════════════════════ */
function PricingReport({ scrollRef, title, finding, stats, accent }: RP) {
  const tiers = [
    { name: "Free", price: "$0", best: false },
    { name: "Pro", price: "$49", best: true },
    { name: "Enterprise", price: "$99", best: false },
  ];
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
      <div className="max-w-[300px] mx-auto space-y-3">
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: accent }}
        >
          Pricing Analysis
        </span>
        <h3 className="text-base font-medium" style={{ color: L.text }}>
          {title}
        </h3>

        {/* Tier cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-2"
        >
          {tiers.map((t) => (
            <div
              key={t.name}
              className="p-2.5 rounded text-center relative"
              style={{
                background: t.best ? `${accent}06` : "white",
                border: `1px solid ${t.best ? `${accent}30` : L.borderLight}`,
              }}
            >
              {t.best && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 font-IBMPlexMono px-2 py-0.5 rounded-full text-white"
                  style={{ background: accent, fontSize: "9px" }}
                >
                  Best
                </span>
              )}
              <span className="text-xs block" style={{ color: L.textFaint }}>
                {t.name}
              </span>
              <span
                className="text-base font-medium block mt-0.5"
                style={{ color: t.best ? accent : L.text }}
              >
                {t.price}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Conversion stats */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex gap-2"
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex-1 py-2 px-2 rounded text-center"
              style={{ background: L.bgSub }}
            >
              <span className="text-sm font-medium block" style={{ color: L.text }}>
                {s.value}
              </span>
              <span className="text-xs" style={{ color: L.textFaint }}>
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm leading-relaxed"
          style={{ color: L.textMuted, borderLeft: `2px solid ${accent}40`, paddingLeft: 12 }}
        >
          {finding}
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   6. Paper — Chapter Book with Large Numbers
   Matches "misc" prompt: large chapter numbers, dimension-based structure
   ═══════════════════════════════════════════════ */
function PaperReport({ scrollRef, title, finding, stats, accent }: RP) {
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
      <div className="max-w-[260px] mx-auto space-y-3">
        {/* Large chapter number as background — signature visual */}
        <div className="relative">
          <span
            className="text-5xl font-medium absolute -top-1 -left-1 select-none"
            style={{ color: `${L.border}60` }}
          >
            01
          </span>
          <div className="pt-6">
            <h3 className="text-base font-medium leading-tight" style={{ color: L.text }}>
              {title}
            </h3>
            <p className="text-xs mt-1" style={{ color: L.textFaint }}>
              atypica.AI Research · 2024
            </p>
          </div>
        </div>

        {/* Abstract */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ borderTop: `1px solid ${L.border}`, paddingTop: 12 }}
        >
          <span
            className="font-IBMPlexMono text-xs tracking-wider uppercase block mb-1.5"
            style={{ color: L.textFaint }}
          >
            Abstract
          </span>
          <p className="text-sm leading-relaxed italic" style={{ color: L.textSub }}>
            {finding}
          </p>
        </motion.div>

        {/* Metrics as alternating rows */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <span
            className="font-IBMPlexMono text-xs tracking-wider uppercase block mb-1.5"
            style={{ color: L.textFaint }}
          >
            Key Metrics
          </span>
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded"
              style={{ background: i % 2 === 0 ? L.bgSub : "transparent" }}
            >
              <span className="text-sm" style={{ color: L.text }}>
                {s.label}
              </span>
              <span className="text-sm font-medium font-IBMPlexMono" style={{ color: accent }}>
                {s.value}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Podcast */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <PodcastBar accent={accent} />
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   7. Dashboard — Metric Card Grid (FastInsight style)
   Matches "fastInsight" prompt: compact metric cards, Bloomberg Terminal density
   ═══════════════════════════════════════════════ */
function DashboardReport({ scrollRef, title, finding, stats, accent }: RP) {
  const direction =
    stats.find((s) => s.label.includes("Direction") || s.label.includes("方向"))?.value ??
    "Bullish";
  const confidence =
    stats.find((s) => s.label.includes("Confidence") || s.label.includes("置信"))?.value ?? "68%";
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4">
      <div className="max-w-[340px] mx-auto space-y-2.5">
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: accent }}
        >
          Consensus
        </span>
        <h3 className="text-sm font-medium" style={{ color: L.text }}>
          {title}
        </h3>

        {/* Compact metric card grid — signature of FastInsight density */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-1.5"
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="py-2 px-2 rounded"
              style={{ background: "white", border: `1px solid ${L.borderLight}` }}
            >
              <span
                className="text-base font-medium block"
                style={{ color: i === 0 ? accent : L.text }}
              >
                {s.value}
              </span>
              <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Direction + confidence bar */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 p-2.5 rounded"
          style={{ background: `${accent}05` }}
        >
          <span className="text-sm font-medium" style={{ color: accent }}>
            📈 {direction}
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: L.bgSub }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: accent }}
              initial={{ width: 0 }}
              animate={{ width: confidence }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
          </div>
          <span className="font-IBMPlexMono text-xs" style={{ color: accent }}>
            {confidence}
          </span>
        </motion.div>

        {/* Finding — tight spacing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm leading-relaxed p-2.5 rounded"
          style={{ background: L.bgSub, color: L.text }}
        >
          {finding}
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
function PodcastBar({ accent }: { accent: string }) {
  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-lg"
      style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}
    >
      <div
        className="w-7 h-7 rounded-full grid place-items-center shrink-0"
        style={{ background: accent }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
          <polygon points="6,3 20,12 6,21" />
        </svg>
      </div>
      <div className="flex-1 flex items-center gap-0.5 h-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${3 + Math.sin(i * 0.7) * 5 + Math.random() * 3}px`,
              background: i < 8 ? accent : L.border,
            }}
          />
        ))}
      </div>
      <span className="font-IBMPlexMono text-xs shrink-0" style={{ color: L.textFaint }}>
        12:34
      </span>
    </div>
  );
}
