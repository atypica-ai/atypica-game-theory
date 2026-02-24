"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import {
  CHAPTERS,
  WORLD_MODEL_DIMENSIONS,
  WORLD_MODEL_LAYERS,
} from "../content";

const copy = CHAPTERS[1];

const LAYER_COLORS = ["#16a34a", "#3b82f6", "#d97706", "#8b5cf6"] as const;

/* ── Gap Chart ── */

const GAP_DATA = [
  { key: "price", stated: 0.85, actual: 0.25 },
  { key: "brand", stated: 0.15, actual: 0.72 },
  { key: "social", stated: 0.18, actual: 0.78 },
  { key: "education", stated: 0.2, actual: 0.92 },
  { key: "selfCare", stated: 0.82, actual: 0.22 },
] as const;

function GapChart({ t }: { t: ReturnType<typeof useTranslations> }) {
  const labels: Record<string, string> = {
    price: t("worldModel.chartDomains.price"),
    brand: t("worldModel.chartDomains.brand"),
    social: t("worldModel.chartDomains.social"),
    education: t("worldModel.chartDomains.education"),
    selfCare: t("worldModel.chartDomains.selfCare"),
  };

  const W = 560, H = 160, pL = 30, pR = 30, pT = 16, pB = 26;
  const pW = W - pL - pR, pH = H - pT - pB;
  const xS = pW / (GAP_DATA.length - 1);
  const x = (i: number) => pL + i * xS;
  const y = (v: number) => pT + pH * (1 - v);

  const stated = GAP_DATA.map((d, i) => `${x(i)},${y(d.stated)}`).join(" ");
  const actual = GAP_DATA.map((d, i) => `${x(i)},${y(d.actual)}`).join(" ");
  const fill = [...GAP_DATA.map((d, i) => `${x(i)},${y(d.stated)}`), ...[...GAP_DATA].reverse().map((d, i) => `${x(GAP_DATA.length - 1 - i)},${y(d.actual)}`)].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" fill="none">
      {[0.25, 0.5, 0.75].map((v) => (
        <line key={v} x1={pL} y1={y(v)} x2={W - pR} y2={y(v)} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="2 5" />
      ))}
      <polygon points={fill} fill="rgba(27,255,27,0.04)" />
      <polyline points={stated} stroke="rgba(27,255,27,0.45)" strokeWidth="1.5" strokeDasharray="5 3" fill="none" />
      <polyline points={actual} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none" />
      {GAP_DATA.map((d, i) => (
        <g key={d.key}>
          <circle cx={x(i)} cy={y(d.stated)} r="3" fill="rgba(27,255,27,0.5)" stroke="rgba(27,255,27,0.15)" strokeWidth="3" />
          <circle cx={x(i)} cy={y(d.actual)} r="3" fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <text x={x(i)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontFamily="var(--font-ibm-plex-mono)" fontSize="8" letterSpacing="0.5">{labels[d.key]?.toUpperCase()}</text>
        </g>
      ))}
      <line x1={W - 130} y1={8} x2={W - 112} y2={8} stroke="rgba(27,255,27,0.5)" strokeWidth="1.5" strokeDasharray="4 2" />
      <text x={W - 108} y={11} fill="rgba(255,255,255,0.3)" fontFamily="var(--font-ibm-plex-mono)" fontSize="7">{t("worldModel.chartStated")}</text>
      <line x1={W - 58} y1={8} x2={W - 40} y2={8} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <text x={W - 36} y={11} fill="rgba(255,255,255,0.3)" fontFamily="var(--font-ibm-plex-mono)" fontSize="7">{t("worldModel.chartActual")}</text>
    </svg>
  );
}

/* ── Matrix ── */

const MATRIX_ROWS = [
  { row: "Expression", cols: ["Moderate", "Moderate", "Low ↗"] },
  { row: "Story", cols: ["—", "Moderate", "Moderate"] },
  { row: "Cognition", cols: ["—", "—", "Domain-specific"] },
];
const MATRIX_COLS = ["Story", "Cognition", "Behavior"];

/* ── Section ── */

export default function WorldModelSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const [activeLayer, setActiveLayer] = useState(-1);

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        {/* ── Header ── */}
        <div className="mb-14">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">{copy.number}</div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">{t("worldModel.kicker")}</p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1] mb-4">{t("worldModel.title")}</h2>
          <p className="max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">{t("worldModel.body")}</p>
        </div>

        {/* ── Four Layers: orbit + cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-[#1bff1b]/60 mb-2">{t("worldModel.datasetTitle")}</p>
            <p className="max-w-[64ch] text-sm leading-relaxed text-zinc-400">{t("worldModel.datasetBody")}</p>
          </div>

          <div className="grid grid-cols-[1fr_360px] gap-10 items-center max-lg:grid-cols-1 max-lg:gap-8">
            {/* Orbit */}
            <div className="relative w-full aspect-square max-w-[480px] mx-auto">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
                {WORLD_MODEL_LAYERS.map((layer, i) => (
                  <circle key={layer.key} cx="50" cy="50" r={layer.radius} stroke={LAYER_COLORS[i]} strokeWidth={activeLayer === i ? "0.7" : "0.35"} strokeOpacity={activeLayer === i ? 0.9 : 0.35} fill="none" className="cursor-pointer transition-[stroke-width,stroke-opacity] duration-200" onMouseEnter={() => setActiveLayer(i)} onMouseLeave={() => setActiveLayer(-1)} />
                ))}
                {WORLD_MODEL_DIMENSIONS.map((n) => (
                  <line key={n.key} x1="50" y1="50" x2={n.x} y2={n.y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
                ))}
              </svg>
              <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-zinc-700 bg-zinc-900 grid place-items-center font-IBMPlexMono text-xs tracking-[0.08em]" animate={{ boxShadow: ["0 0 0 0 rgba(27,255,27,0.15)", "0 0 0 10px rgba(27,255,27,0)"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}>
                <span className="text-[#1bff1b] font-medium">{t("worldModel.center")}</span>
              </motion.div>
              {WORLD_MODEL_DIMENSIONS.map((n) => (
                <span key={n.key} className="absolute -translate-x-1/2 -translate-y-1/2 font-IBMPlexMono text-xs tracking-[0.06em] text-zinc-500 pointer-events-none whitespace-nowrap" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
                  {t(`worldModel.dimensions.${n.key}.label`)}
                </span>
              ))}
            </div>

            {/* Layer cards */}
            <div className="grid gap-2.5 self-center">
              {WORLD_MODEL_LAYERS.map((layer, i) => (
                <div key={layer.key} className={cn("border py-4 px-5 cursor-pointer transition-all duration-200", activeLayer === i ? "border-zinc-600 bg-zinc-800" : "border-zinc-800 bg-transparent")} onMouseEnter={() => setActiveLayer(i)} onMouseLeave={() => setActiveLayer(-1)}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LAYER_COLORS[i] }} />
                    <span className={cn("text-sm font-medium transition-colors duration-200", activeLayer === i ? "text-zinc-100" : "text-zinc-400")}>{t(`worldModel.layers.${layer.key}.label`)}</span>
                  </div>
                  <p className="text-xs italic text-zinc-500 pl-[18px] mb-1">{t(`worldModel.layers.${layer.key}.question`)}</p>
                  <p className="text-sm leading-relaxed text-zinc-500 pl-[18px]">{t(`worldModel.layers.${layer.key}.description`)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════
             Cross-layer — vertical editorial flow
             ════════════════════════════════════════ */}

          <div className="border-t border-zinc-800 mt-16 pt-10">
            <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-[#1bff1b]/60 mb-1">{t("worldModel.crossTitle")}</p>
            <p className="text-sm text-zinc-500 mb-8">{t("worldModel.crossBody")}</p>

            {/* 1) Chart — full width, constrained, centered */}
            <div className="max-w-[560px] mx-auto">
              <GapChart t={t} />
            </div>

            {/* 2) Says → Does — full width, directly under chart */}
            <div className="grid grid-cols-3 gap-px mt-4 bg-zinc-800 max-lg:grid-cols-1">
              {(["price", "social", "brand"] as const).map((key) => (
                <div key={key} className="bg-zinc-900 py-3 px-4">
                  <p className="text-xs text-zinc-600 mb-0.5">{t(`worldModel.crossExamples.${key}.says`)}</p>
                  <p className="text-xs text-zinc-300">{t(`worldModel.crossExamples.${key}.does`)}</p>
                </div>
              ))}
            </div>

            {/* 3) Matrix — full width, breathing room */}
            <div className="mt-10">
              <p className="font-IBMPlexMono text-xs tracking-[0.08em] uppercase text-zinc-500 mb-3">{t("worldModel.matrixTitle")}</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="font-IBMPlexMono text-xs tracking-[0.06em] uppercase text-zinc-600 py-3 px-5 border-b border-zinc-700 text-left w-[180px]" />
                    {MATRIX_COLS.map((h) => (
                      <th key={h} className="font-IBMPlexMono text-xs tracking-[0.06em] uppercase text-zinc-400 py-3 px-5 border-b border-zinc-700 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_ROWS.map((row) => (
                    <tr key={row.row}>
                      <td className="font-IBMPlexMono text-xs text-zinc-300 py-4 px-5 border-b border-zinc-800/60 bg-zinc-800/20">{row.row}</td>
                      {row.cols.map((cell, i) => (
                        <td key={`${row.row}-${i}`} className={cn(
                          "text-sm text-center py-4 px-5 border-b border-zinc-800/60",
                          cell === "Low ↗" ? "text-[#1bff1b] bg-[rgba(27,255,27,0.03)] font-medium" : cell === "—" ? "text-zinc-700" : cell === "Domain-specific" ? "text-zinc-500 italic text-xs" : "text-zinc-400",
                        )}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="font-IBMPlexMono text-xs text-zinc-600 mt-3 leading-relaxed">{t("worldModel.matrixNote")}</p>
            </div>

            {/* 4) Enables — single line footer */}
            <div className="mt-8 pt-6 border-t border-zinc-800/50 flex items-baseline gap-2 flex-wrap">
              <span className="font-IBMPlexMono text-xs tracking-[0.08em] uppercase text-zinc-600 shrink-0">{t("worldModel.enablesTitle")}:</span>
              {(["enableSimulation", "enableCounterfactual", "enableStressTest"] as const).map((key, i) => (
                <span key={key} className="text-xs text-zinc-500">
                  {i > 0 && <span className="text-zinc-700 mr-2">·</span>}
                  {t(`worldModel.${key}`)}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
