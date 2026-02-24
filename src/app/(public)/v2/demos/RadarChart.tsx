"use client";

import { motion } from "framer-motion";
import { L } from "./theme";

const DIMS = 7;
const CX = 100, CY = 100, R = 58;

const DIM_LABELS = ["Demo", "Geo", "Psych", "Behav", "Needs", "Tech", "Social"];
const SCORES = [2.5, 1.2, 2.8, 2.1, 1.5, 0.8, 2.0];

function pt(i: number, r: number) {
  const a = (2 * Math.PI * i) / DIMS - Math.PI / 2;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function poly(r: number) {
  return Array.from({ length: DIMS }, (_, i) => pt(i, r))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}

/**
 * 7-dimension radar chart for persona analysis.
 * Labels can be overridden via the labels prop (for i18n).
 */
export default function RadarChart({
  labels,
  scores = SCORES,
  animate = true,
}: {
  labels?: string[];
  scores?: number[];
  animate?: boolean;
}) {
  const lbls = labels ?? DIM_LABELS;
  const dataPoly = scores
    .map((s, i) => pt(i, (s / 3) * R))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
      {/* Grid */}
      {[1 / 3, 2 / 3, 1].map((s) => (
        <polygon key={s} points={poly(R * s)} stroke={L.border} strokeWidth="0.5" fill="none" />
      ))}
      {/* Axes */}
      {Array.from({ length: DIMS }, (_, i) => {
        const p = pt(i, R);
        return (
          <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={L.border} strokeWidth="0.5" />
        );
      })}
      {/* Data polygon */}
      {animate ? (
        <motion.polygon
          points={dataPoly}
          fill="rgba(22,163,74,0.12)"
          stroke={L.green}
          strokeWidth="1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      ) : (
        <polygon points={dataPoly} fill="rgba(22,163,74,0.12)" stroke={L.green} strokeWidth="1" />
      )}
      {/* Data dots */}
      {scores.map((s, i) => {
        const p = pt(i, (s / 3) * R);
        return animate ? (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill={L.green}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
          />
        ) : (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={L.green} />
        );
      })}
      {/* Labels */}
      {lbls.map((label, i) => {
        const p = pt(i, R + 16);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={L.textMuted}
            fontFamily="var(--font-ibm-plex-mono)"
            fontSize="8"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
