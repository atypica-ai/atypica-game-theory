"use client";

import { motion } from "motion/react";

export type VisualPhase = "discussion" | "commitment" | "analyze" | "completed";

interface PhaseProgressProps {
  phase: VisualPhase;
  hasDiscussion: boolean;
}

export function PhaseProgress({ phase, hasDiscussion }: PhaseProgressProps) {
  const steps = hasDiscussion
    ? (["discussion", "commitment", "analyze"] as const)
    : (["commitment", "analyze"] as const);

  const activeIdx = steps.indexOf(phase as (typeof steps)[number]);

  return (
    <div className="flex items-center justify-between w-full max-w-md relative">
      {/* Connector line */}
      <div
        className="absolute top-[6px] left-0 w-full h-px z-0"
        style={{ background: "var(--gt-border-md)" }}
      />

      {steps.map((step, i) => {
        const isCurrent = phase === step;
        const isPast = activeIdx > i;
        // Current: indigo filled, Past: grey filled, Future: hollow
        const dotBg = isCurrent
          ? "var(--gt-indigo)"
          : isPast
            ? "var(--gt-done)"
            : "var(--gt-surface)";
        const dotBorder = isCurrent
          ? "var(--gt-indigo)"
          : isPast
            ? "var(--gt-done)"
            : "var(--gt-border-md)";
        const labelColor = isCurrent
          ? "var(--gt-indigo)"
          : isPast
            ? "var(--gt-t3)"
            : "var(--gt-t4)";

        return (
          <div key={step} className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={false}
              animate={{
                backgroundColor: dotBg,
                borderColor: dotBorder,
                scale: isCurrent ? 1.3 : 1,
              }}
              className="w-3 h-3 rounded-full border-2"
            />
            <span
              className="text-[10px] mt-2 font-bold uppercase"
              style={{ color: labelColor, letterSpacing: "-0.02em" }}
            >
              {STEP_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const STEP_LABELS: Record<string, string> = {
  discussion: "Discussion",
  commitment: "Commitment",
  analyze: "Analyze",
};
