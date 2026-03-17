"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, WORLD_MODEL_LAYERS } from "../content";

const copy = CHAPTERS[1];

const LAYER_COLORS = ["var(--ghost-green)", "#3b82f6", "#d97706", "#8b5cf6"] as const;

/* ── Decorative Orbit (no labels, no interaction) ── */

function OrbitDecoration() {
  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto opacity-50">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
        {WORLD_MODEL_LAYERS.map((layer, i) => (
          <circle
            key={layer.key}
            cx="50"
            cy="50"
            r={layer.radius}
            stroke={LAYER_COLORS[i]}
            strokeWidth="0.35"
            strokeOpacity="0.4"
            fill="none"
          />
        ))}
      </svg>
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-zinc-700 bg-zinc-900 grid place-items-center font-IBMPlexMono text-xs tracking-[0.08em]"
        animate={{ boxShadow: ["0 0 0 0 rgba(27,255,27,0.15)", "0 0 0 10px rgba(27,255,27,0)"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      >
        <span className="text-ghost-green font-medium text-[10px]">SWM</span>
      </motion.div>
    </div>
  );
}

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

  const W = 800,
    H = 180,
    pL = 40,
    pR = 40,
    pT = 20,
    pB = 32;
  const pW = W - pL - pR,
    pH = H - pT - pB;
  const xS = pW / (GAP_DATA.length - 1);
  const x = (i: number) => pL + i * xS;
  const y = (v: number) => pT + pH * (1 - v);

  const stated = GAP_DATA.map((d, i) => `${x(i)},${y(d.stated)}`).join(" ");
  const actual = GAP_DATA.map((d, i) => `${x(i)},${y(d.actual)}`).join(" ");
  const fill = [
    ...GAP_DATA.map((d, i) => `${x(i)},${y(d.stated)}`),
    ...[...GAP_DATA].reverse().map((d, i) => `${x(GAP_DATA.length - 1 - i)},${y(d.actual)}`),
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" fill="none">
      {[0.25, 0.5, 0.75].map((v) => (
        <line
          key={v}
          x1={pL}
          y1={y(v)}
          x2={W - pR}
          y2={y(v)}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.4"
          strokeDasharray="2 5"
        />
      ))}
      <polygon points={fill} fill="rgba(27,255,27,0.03)" />
      <polyline
        points={stated}
        stroke="rgba(27,255,27,0.4)"
        strokeWidth="1"
        strokeDasharray="4 3"
        fill="none"
      />
      <polyline points={actual} stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" />
      {GAP_DATA.map((d, i) => (
        <g key={d.key}>
          <circle
            cx={x(i)}
            cy={y(d.stated)}
            r="2"
            fill="rgba(27,255,27,0.5)"
            stroke="rgba(27,255,27,0.12)"
            strokeWidth="2"
          />
          <circle
            cx={x(i)}
            cy={y(d.actual)}
            r="2"
            fill="rgba(255,255,255,0.6)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
          <text
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontFamily="var(--font-ibm-plex-mono)"
            fontSize="7.5"
            letterSpacing="0.5"
          >
            {labels[d.key]?.toUpperCase()}
          </text>
        </g>
      ))}
      <line
        x1={W - 130}
        y1={8}
        x2={W - 115}
        y2={8}
        stroke="rgba(27,255,27,0.4)"
        strokeWidth="1"
        strokeDasharray="4 2"
      />
      <text
        x={W - 112}
        y={11}
        fill="rgba(255,255,255,0.35)"
        fontFamily="var(--font-ibm-plex-mono)"
        fontSize="7.5"
      >
        {t("worldModel.chartStated")}
      </text>
      <line x1={W - 58} y1={8} x2={W - 43} y2={8} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <text
        x={W - 40}
        y={11}
        fill="rgba(255,255,255,0.35)"
        fontFamily="var(--font-ibm-plex-mono)"
        fontSize="7.5"
      >
        {t("worldModel.chartActual")}
      </text>
    </svg>
  );
}

/* ── Consistency Matrix ── */

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

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        {/* ════════════════════════════════════════
           Part 1: MODEL — the statement
           ════════════════════════════════════════ */}
        <div className="grid grid-cols-[1fr_280px] gap-12 items-center max-lg:grid-cols-1 max-lg:gap-8 mb-20">
          <div>
            <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-ghost-green mb-4">
              {copy.number}
            </div>
            <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
              {t("worldModel.kicker")}
            </p>
            <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1] mb-6">
              {t("worldModel.title")}
            </h2>
            <p className="max-w-[56ch] text-base lg:text-lg leading-relaxed text-zinc-300">
              {t("worldModel.body")}
            </p>
          </div>
          <div className="max-lg:hidden">
            <OrbitDecoration />
          </div>
        </div>

        {/* ════════════════════════════════════════
           Part 2: DATASETS — four-layer structure
           ════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="border-t border-zinc-800 pt-12">
            <p className="font-IBMPlexMono text-sm tracking-[0.14em] uppercase text-ghost-green/60 mb-2">
              {t("worldModel.datasetTitle")}
            </p>
            <p className="max-w-[64ch] text-sm leading-relaxed text-zinc-300 mb-10">
              {t("worldModel.datasetBody")}
            </p>

            {/* 2×2 Layer Grid */}
            <div className="grid grid-cols-2 gap-px bg-zinc-800 max-lg:grid-cols-1">
              {WORLD_MODEL_LAYERS.map((layer, i) => (
                <div key={layer.key} className="bg-zinc-900 p-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: LAYER_COLORS[i] }}
                    />
                    <span className="text-base font-medium text-zinc-100">
                      {t(`worldModel.layers.${layer.key}.label`)}
                    </span>
                  </div>
                  <p className="text-sm italic text-zinc-300 mb-4 pl-[22px]">
                    {t(`worldModel.layers.${layer.key}.question`)}
                  </p>
                  <div className="pl-[22px] space-y-2">
                    <div>
                      <span className="font-IBMPlexMono text-sm tracking-[0.04em] text-zinc-500">
                        {t("worldModel.sourcesLabel")}:{" "}
                      </span>
                      <span className="text-sm text-zinc-300">
                        {t(`worldModel.layers.${layer.key}.sources`)}
                      </span>
                    </div>
                    <div>
                      <span className="font-IBMPlexMono text-sm tracking-[0.04em] text-zinc-500">
                        {t("worldModel.objectiveLabel")}:{" "}
                      </span>
                      <span className="text-sm text-zinc-300">
                        {t(`worldModel.layers.${layer.key}.description`)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ════════════════════════════════════════
               Part 3: Cross-layer analysis
               ════════════════════════════════════════ */}
            <div className="border-t border-zinc-800 mt-14 pt-10">
              <p className="text-base font-medium text-zinc-100 mb-1">
                {t("worldModel.crossTitle")}
              </p>
              <p className="text-sm text-zinc-300 mb-8">{t("worldModel.crossBody")}</p>

              {/* Gap Chart — full width */}
              <GapChart t={t} />

              {/* Says → Does */}
              <div className="grid grid-cols-3 gap-px mt-4 bg-zinc-800 max-lg:grid-cols-1">
                {(["price", "social", "brand"] as const).map((key) => (
                  <div key={key} className="bg-zinc-900 py-4 px-5">
                    <p className="text-sm text-zinc-500 mb-1">
                      {t(`worldModel.crossExamples.${key}.says`)}
                    </p>
                    <p className="text-sm text-zinc-200">
                      {t(`worldModel.crossExamples.${key}.does`)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Consistency Matrix */}
              <div className="mt-10">
                <p className="font-IBMPlexMono text-sm tracking-[0.08em] uppercase text-zinc-400 mb-3">
                  {t("worldModel.matrixTitle")}
                </p>
                <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="font-IBMPlexMono text-xs sm:text-sm tracking-[0.06em] uppercase text-zinc-500 py-2.5 px-2 sm:py-3 sm:px-5 border-b border-zinc-700 text-left" />
                      {MATRIX_COLS.map((h) => (
                        <th
                          key={h}
                          className="font-IBMPlexMono text-xs sm:text-sm tracking-[0.06em] uppercase text-zinc-400 py-2.5 px-2 sm:py-3 sm:px-5 border-b border-zinc-700 text-center"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MATRIX_ROWS.map((row) => (
                      <tr key={row.row}>
                        <td className="font-IBMPlexMono text-xs sm:text-sm text-zinc-300 py-3 px-2 sm:py-4 sm:px-5 border-b border-zinc-800/60 bg-zinc-800/20">
                          {row.row}
                        </td>
                        {row.cols.map((cell, ci) => (
                          <td
                            key={`${row.row}-${ci}`}
                            className={cn(
                              "text-xs sm:text-sm text-center py-3 px-2 sm:py-4 sm:px-5 border-b border-zinc-800/60",
                              cell === "Low ↗"
                                ? "text-ghost-green bg-ghost-green/[0.03] font-medium"
                                : cell === "—"
                                  ? "text-zinc-700"
                                  : cell === "Domain-specific"
                                    ? "text-zinc-300 italic"
                                    : "text-zinc-300",
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                  {t("worldModel.matrixNote")}
                </p>
              </div>

              {/* Enables — three-column typographic layout */}
              <div className="mt-10 pt-8 border-t border-zinc-800/50">
                <p className="font-IBMPlexMono text-sm tracking-[0.08em] uppercase text-zinc-400 mb-6">
                  {t("worldModel.enablesTitle")}
                </p>
                <div className="grid grid-cols-3 gap-8 max-lg:grid-cols-1 max-lg:gap-6">
                  {(["simulation", "counterfactual", "stressTest"] as const).map((key, i) => (
                    <div
                      key={key}
                      className="border-l-2 pl-4"
                      style={{ borderColor: LAYER_COLORS[i] }}
                    >
                      <p className="text-base font-medium text-zinc-100 mb-1">
                        {t(`worldModel.enables.${key}.title`)}
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {t(`worldModel.enables.${key}.desc`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
