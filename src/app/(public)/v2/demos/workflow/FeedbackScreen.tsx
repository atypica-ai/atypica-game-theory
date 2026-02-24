"use client";

import { motion } from "framer-motion";
import { L } from "../theme";

/**
 * AI coaching/feedback screen. All data passed as props — no dynamic i18n.
 */
export default function FeedbackScreen({
  score,
  title,
  subtitle,
  strengths,
  improvements,
  strategy,
}: {
  score: number;
  title: string;
  subtitle: string;
  strengths: string[];
  improvements: string[];
  strategy: string;
}) {
  const accent = L.green;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-4"
      >
        <div className="relative shrink-0">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={radius} fill="none" stroke={L.bgSub} strokeWidth="4" />
            <motion.circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, delay: 0.3 }}
              transform="rotate(-90 38 38)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-medium" style={{ color: L.text }}>
              {score}
            </span>
            <span className="font-IBMPlexMono" style={{ color: L.textFaint, fontSize: "9px" }}>
              /100
            </span>
          </div>
        </div>
        <div>
          <span className="text-sm font-medium block" style={{ color: L.text }}>
            {title}
          </span>
          <span className="text-xs" style={{ color: L.textMuted }}>
            {subtitle}
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="p-2.5 rounded-lg"
        style={{ background: `${accent}06`, border: `1px solid ${accent}15` }}
      >
        <span className="font-IBMPlexMono text-xs block mb-1.5" style={{ color: accent }}>
          ✓ Strengths
        </span>
        <div className="space-y-1">
          {strengths.map((s, i) => (
            <p key={i} className="text-xs leading-relaxed" style={{ color: L.text }}>
              • {s}
            </p>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="p-2.5 rounded-lg"
        style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}
      >
        <span className="font-IBMPlexMono text-xs block mb-1.5" style={{ color: "#d97706" }}>
          ↑ Areas to Improve
        </span>
        <div className="space-y-1">
          {improvements.map((s, i) => (
            <p key={i} className="text-xs leading-relaxed" style={{ color: L.text }}>
              • {s}
            </p>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="text-sm leading-relaxed pl-3"
        style={{ color: L.textMuted, borderLeft: `2px solid ${accent}40` }}
      >
        {strategy}
      </motion.div>
    </div>
  );
}
