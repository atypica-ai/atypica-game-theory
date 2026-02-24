"use client";

import React from "react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { L } from "../theme";

type ReportVariant = "insight" | "verdict" | "concept" | "journey" | "pricing" | "paper" | "dashboard" | "default";

/**
 * Report screen with 8 distinct visual styles — one per use case.
 * Each variant has a unique layout AND varying widths (some centered-narrow, some full).
 * Content scrolls within the fixed container, auto-scrolls to reveal.
 */
export type StatItem = { label: string; value: string };

/**
 * Report screen with 8 distinct visual styles — one per use case.
 * All content passed as props — no dynamic i18n key construction.
 */
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

  const props: ReportProps = { scrollRef, title, finding, stats, accent };

  switch (variant) {
    case "insight": return <InsightReport {...props} />;
    case "verdict": return <VerdictReport {...props} />;
    case "concept": return <ConceptReport {...props} />;
    case "journey": return <JourneyReport {...props} />;
    case "pricing": return <PricingReport {...props} />;
    case "paper": return <PaperReport {...props} />;
    case "dashboard": return <DashboardReport {...props} />;
    default: return <InsightReport {...props} />;
  }
}

type ReportProps = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  finding: string;
  stats: { label: string; value: string }[];
  accent: string;
};

/* ═══════════════════════════════════════════════
   Variant 1: Insight — Big headline + data grid + trend arrows
   Used by: Consumer Insight
   ═══════════════════════════════════════════════ */
function InsightReport({ scrollRef, title, finding, stats, accent }: ReportProps) {
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="px-5 pt-5 pb-4"
        style={{ background: `linear-gradient(180deg, ${accent}08, transparent)` }}
      >
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase" style={{ color: accent }}>Report</span>
        <h3 className="text-base font-medium mt-1" style={{ color: L.text }}>{title}</h3>
      </motion.div>

      {/* Big stat hero */}
      {stats[0] && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="px-5 pb-4">
          <span className="text-3xl font-medium" style={{ color: accent }}>{stats[0].value}</span>
          <span className="text-sm ml-2" style={{ color: L.textMuted }}>{stats[0].label}</span>
        </motion.div>
      )}

      {/* Stats grid */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="px-5 pb-4 grid grid-cols-3 gap-2">
        {stats.slice(0, 3).map((s, i) => (
          <div key={i} className="py-2 px-2.5 rounded" style={{ background: "white", border: `1px solid ${L.borderLight}` }}>
            <span className="font-IBMPlexMono text-xs block" style={{ color: L.textFaint }}>{s.label}</span>
            <span className="text-sm font-medium mt-0.5 block" style={{ color: L.text }}>{s.value}</span>
          </div>
        ))}
      </motion.div>

      {/* Key finding with accent bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="px-5 pb-4">
        <div className="p-3 rounded-lg" style={{ background: `${accent}06`, border: `1px solid ${accent}15` }}>
          <span className="font-IBMPlexMono text-xs block mb-1.5" style={{ color: accent }}>Key Finding</span>
          <p className="text-sm leading-relaxed" style={{ color: L.text }}>{finding}</p>
        </div>
      </motion.div>

      {/* Podcast player */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="px-5 pb-5">
        <PodcastBar accent={accent} />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Variant 2: Verdict — Big approval score circle + thumbs breakdown
   Used by: Concept Testing
   ═══════════════════════════════════════════════ */
function VerdictReport({ scrollRef, title, finding, stats, accent }: ReportProps) {
  const approval = stats.find(s => s.label.includes("Approval") || s.label.includes("认可"))?.value ?? "67%";
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
    <div className="max-w-[280px] mx-auto space-y-3">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase" style={{ color: accent }}>Concept Test</span>
        <h3 className="text-base font-medium mt-1" style={{ color: L.text }}>{title}</h3>
      </motion.div>

      {/* Big approval score */}
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }} className="flex justify-center">
        <div className="relative w-20 h-20">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke={L.bgSub} strokeWidth="4" />
            <motion.circle cx="40" cy="40" r="34" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={213.6} initial={{ strokeDashoffset: 213.6 }} animate={{ strokeDashoffset: 213.6 * (1 - 0.67) }}
              transition={{ duration: 1, delay: 0.3 }} transform="rotate(-90 40 40)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-medium" style={{ color: L.text }}>{approval}</span>
          </div>
        </div>
      </motion.div>

      {/* Verdict cards */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 gap-2">
        {stats.slice(1).map((s, i) => (
          <div key={i} className="p-2.5 rounded text-center" style={{ background: "white", border: `1px solid ${L.borderLight}` }}>
            <span className="text-sm font-medium block" style={{ color: L.text }}>{s.value}</span>
            <span className="text-xs" style={{ color: L.textFaint }}>{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Finding */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
        className="text-sm leading-relaxed pl-3" style={{ color: L.textMuted, borderLeft: `2px solid ${accent}40` }}>
        {finding}
      </motion.div>
    </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Variant 3: Product Concept — PPT-style hero banner + innovation reasoning
   Used by: Product R&D
   ═══════════════════════════════════════════════ */
function ConceptReport({ scrollRef, title, finding, stats, accent }: ReportProps) {
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {/* Full-bleed hero section (PPT style) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="px-5 py-5" style={{ background: `linear-gradient(135deg, ${L.text}08, ${accent}06)` }}>
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase block mb-2" style={{ color: accent }}>Product Innovation</span>
        <h3 className="text-lg font-medium leading-tight" style={{ color: L.text }}>{title}</h3>
        <p className="text-xs mt-1.5" style={{ color: L.textMuted }}>Cross-domain inspiration · Audience validated</p>
      </motion.div>

      <div className="px-5 py-3 space-y-3">
        {/* Stats in horizontal band */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-3">
          {stats.map((s, i) => (
            <div key={i} className="flex-1 text-center py-2 rounded" style={{ background: "white", border: `1px solid ${L.borderLight}` }}>
              <span className="text-base font-medium block" style={{ color: accent }}>{s.value}</span>
              <span className="text-xs" style={{ color: L.textFaint }}>{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Innovation reasoning flow */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-1.5">
          <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>Innovation Path</span>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: L.textMuted }}>
            <span className="px-2 py-1 rounded" style={{ background: `${accent}08`, border: `1px solid ${accent}15`, color: accent }}>Product</span>
            <span>→</span>
            <span className="px-2 py-1 rounded" style={{ background: L.bgSub }}>Trend Scout</span>
            <span>→</span>
            <span className="px-2 py-1 rounded" style={{ background: L.bgSub }}>Inspiration</span>
            <span>→</span>
            <span className="px-2 py-1 rounded font-medium" style={{ background: `${accent}08`, border: `1px solid ${accent}15`, color: accent }}>Concept</span>
          </div>
        </motion.div>

        {/* Core finding */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="p-3 rounded-lg" style={{ background: "white", border: `1px solid ${L.borderLight}` }}>
          <span className="font-IBMPlexMono text-xs block mb-1" style={{ color: accent }}>Concept Brief</span>
          <p className="text-sm leading-relaxed" style={{ color: L.text }}>{finding}</p>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Variant 4: Journey — Horizontal journey map with pain markers
   Used by: UX & VOC
   ═══════════════════════════════════════════════ */
function JourneyReport({ scrollRef, title, finding, stats, accent }: ReportProps) {
  const stages = ["Discover", "Consider", "Purchase", "Post"];
  const painIndex = 2; // Purchase stage has pain point
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
    <div className="max-w-[320px] mx-auto space-y-3">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase" style={{ color: accent }}>VOC Report</span>
        <h3 className="text-base font-medium mt-1" style={{ color: L.text }}>{title}</h3>
      </motion.div>

      {/* Journey map */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex items-center gap-1 py-3">
        {stages.map((stage, i) => (
          <React.Fragment key={stage}>
            <div className="flex-1 text-center">
              <div className={`w-8 h-8 rounded-full grid place-items-center mx-auto mb-1 ${i === painIndex ? "ring-2" : ""}`}
                style={{
                  background: i === painIndex ? "#dc262610" : `${accent}08`,
                  border: `1px solid ${i === painIndex ? "#dc262640" : `${accent}20`}`,
                }}>
                <span className="text-xs" style={{ color: i === painIndex ? "#dc2626" : accent }}>
                  {i === painIndex ? "✕" : "✓"}
                </span>
              </div>
              <span className="text-xs block" style={{ color: i === painIndex ? "#dc2626" : L.text }}>{stage}</span>
              {i === painIndex && <span className="text-xs block mt-0.5" style={{ color: "#dc2626" }}>⚠ Drop-off</span>}
            </div>
            {i < stages.length - 1 && (
              <div className="w-6 h-px" style={{ background: i < painIndex ? accent : L.border }} />
            )}
          </React.Fragment>
        ))}
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="py-2 px-2 rounded text-center" style={{ background: "white", border: `1px solid ${L.borderLight}` }}>
            <span className="text-sm font-medium block" style={{ color: i === 0 ? "#dc2626" : L.text }}>{s.value}</span>
            <span className="text-xs" style={{ color: L.textFaint }}>{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Finding */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="p-3 rounded-lg" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}>
        <p className="text-sm leading-relaxed" style={{ color: L.text }}>{finding}</p>
      </motion.div>
    </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Variant 5: Pricing — Tier comparison table
   Used by: Pricing & Attribution
   ═══════════════════════════════════════════════ */
function PricingReport({ scrollRef, title, finding, stats, accent }: ReportProps) {
  const tiers = [
    { name: "Free", price: "$0", highlight: false },
    { name: "Pro", price: "$49", highlight: true },
    { name: "Enterprise", price: "$99", highlight: false },
  ];
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
    <div className="max-w-[300px] mx-auto space-y-3">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase" style={{ color: accent }}>Pricing Analysis</span>
        <h3 className="text-base font-medium mt-1" style={{ color: L.text }}>{title}</h3>
      </motion.div>

      {/* Tier comparison */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 gap-2">
        {tiers.map((tier) => (
          <div key={tier.name} className="p-2.5 rounded-lg text-center relative"
            style={{
              background: tier.highlight ? `${accent}06` : "white",
              border: `1px solid ${tier.highlight ? `${accent}30` : L.borderLight}`,
            }}>
            {tier.highlight && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 font-IBMPlexMono text-xs px-2 py-0.5 rounded-full text-white" style={{ background: accent, fontSize: "9px" }}>
                Best
              </span>
            )}
            <span className="text-xs block" style={{ color: L.textFaint }}>{tier.name}</span>
            <span className="text-base font-medium block mt-0.5" style={{ color: tier.highlight ? accent : L.text }}>{tier.price}</span>
          </div>
        ))}
      </motion.div>

      {/* Conversion stats */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex gap-2">
        {stats.map((s, i) => (
          <div key={i} className="flex-1 py-2 px-2 rounded text-center" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}>
            <span className="text-sm font-medium block" style={{ color: L.text }}>{s.value}</span>
            <span className="text-xs" style={{ color: L.textFaint }}>{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Finding */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-sm leading-relaxed pl-3" style={{ color: L.textMuted, borderLeft: `2px solid ${accent}40` }}>
        {finding}
      </motion.div>
    </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Variant 6: Paper — Academic abstract style
   Used by: Academic Research
   ═══════════════════════════════════════════════ */
function PaperReport({ scrollRef, title, finding, stats, accent }: ReportProps) {
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
    <div className="max-w-[260px] mx-auto space-y-3">
      {/* Paper title (serif-style) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pb-2" style={{ borderBottom: `1px solid ${L.border}` }}>
        <h3 className="text-base font-medium leading-tight" style={{ color: L.text }}>{title}</h3>
        <p className="text-xs mt-1" style={{ color: L.textFaint }}>atypica.AI Research Lab · 2024</p>
      </motion.div>

      {/* Abstract */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase block mb-1.5" style={{ color: L.textFaint }}>Abstract</span>
        <p className="text-sm leading-relaxed italic" style={{ color: L.textSub }}>{finding}</p>
      </motion.div>

      {/* Key metrics */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase block mb-1.5" style={{ color: L.textFaint }}>Key Metrics</span>
        <div className="space-y-1.5">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: i % 2 === 0 ? L.bgSub : "transparent" }}>
              <span className="text-sm" style={{ color: L.text }}>{s.label}</span>
              <span className="text-sm font-medium font-IBMPlexMono" style={{ color: accent }}>{s.value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Podcast */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <PodcastBar accent={accent} />
      </motion.div>
    </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Variant 7: Dashboard — Gauge + signals + consensus
   Used by: Investment Prediction
   ═══════════════════════════════════════════════ */
function DashboardReport({ scrollRef, title, finding, stats, accent }: ReportProps) {
  const direction = stats.find(s => s.label.includes("Direction") || s.label.includes("方向"))?.value ?? "Bullish";
  const confidence = stats.find(s => s.label.includes("Confidence") || s.label.includes("置信"))?.value ?? "68%";
  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5">
    <div className="max-w-[320px] mx-auto space-y-3">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase" style={{ color: accent }}>Consensus</span>
        <h3 className="text-base font-medium mt-1" style={{ color: L.text }}>{title}</h3>
      </motion.div>

      {/* Direction + Confidence hero */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
        className="flex items-center gap-4 p-3 rounded-lg" style={{ background: `${accent}06`, border: `1px solid ${accent}15` }}>
        <div className="text-center">
          <span className="text-2xl block">📈</span>
          <span className="text-sm font-medium block mt-1" style={{ color: accent }}>{direction}</span>
        </div>
        <div className="flex-1">
          <span className="text-xs block" style={{ color: L.textFaint }}>Confidence</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: L.bgSub }}>
              <motion.div className="h-full rounded-full" style={{ background: accent }}
                initial={{ width: 0 }} animate={{ width: confidence }} transition={{ duration: 1, delay: 0.3 }} />
            </div>
            <span className="font-IBMPlexMono text-sm font-medium" style={{ color: accent }}>{confidence}</span>
          </div>
        </div>
      </motion.div>

      {/* Source agreement cards */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="py-2 px-2 rounded text-center" style={{ background: "white", border: `1px solid ${L.borderLight}` }}>
            <span className="text-sm font-medium block" style={{ color: L.text }}>{s.value}</span>
            <span className="text-xs" style={{ color: L.textFaint }}>{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Finding */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
        className="p-3 rounded-lg" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}>
        <p className="text-sm leading-relaxed" style={{ color: L.text }}>{finding}</p>
      </motion.div>
    </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Shared: Podcast player bar
   ═══════════════════════════════════════════════ */
function PodcastBar({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}>
      <div className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: accent }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21" /></svg>
      </div>
      <div className="flex-1 flex items-center gap-0.5 h-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="flex-1 rounded-full" style={{
            height: `${3 + Math.sin(i * 0.7) * 5 + Math.random() * 3}px`,
            background: i < 8 ? accent : L.border,
          }} />
        ))}
      </div>
      <span className="font-IBMPlexMono text-xs shrink-0" style={{ color: L.textFaint }}>12:34</span>
    </div>
  );
}

