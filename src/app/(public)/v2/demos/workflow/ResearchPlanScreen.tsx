"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { L } from "../theme";

/**
 * Research Plan confirmation screen — mimics MakeStudyPlanMessage.
 * Shows: plan title + numbered steps (staggered animation) + Cancel / Confirm buttons.
 */
export default function ResearchPlanScreen({
  planTitle,
  steps,
}: {
  planTitle: string;
  steps: string[];
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = L.green;

  return (
    <div className="flex flex-col h-full px-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="font-IBMPlexMono text-xs tracking-wider uppercase" style={{ color: L.textMuted }}>
          {t("workflow.demos.ui.planLabel")}
        </span>
      </div>

      <span className="text-sm font-medium mb-3" style={{ color: L.text }}>
        {planTitle}
      </span>

      {/* Steps list */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.35, duration: 0.3 }}
            className="flex items-start gap-2.5 py-2 px-3 rounded"
            style={{ background: "white", border: `1px solid ${L.borderLight}` }}
          >
            <motion.span
              className="w-5 h-5 rounded-full grid place-items-center font-IBMPlexMono text-xs shrink-0 mt-0.5"
              initial={{ background: "transparent" }}
              animate={{ background: `${accent}10` }}
              transition={{ delay: i * 0.35 + 0.2 }}
              style={{ border: `1px solid ${L.border}`, color: accent }}
            >
              {i + 1}
            </motion.span>
            <span className="text-sm leading-relaxed" style={{ color: L.text }}>
              {step}
            </span>
            <motion.span
              className="ml-auto text-xs mt-0.5"
              style={{ color: accent }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.35 + 0.3 }}
            >
              ✓
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="shrink-0 flex items-center justify-end gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${L.borderLight}` }}>
        <div
          className="px-3 py-1.5 text-xs rounded"
          style={{ border: `1px solid ${L.border}`, color: L.textMuted }}
        >
          {t("workflow.demos.ui.cancelPlan")}
        </div>
        <motion.div
          className="px-4 py-1.5 text-xs font-medium rounded text-white"
          style={{ background: accent }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: steps.length * 0.35 }}
        >
          {t("workflow.demos.ui.confirmPlan")} ✓
        </motion.div>
      </div>
    </div>
  );
}
