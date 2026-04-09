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
    <div className="flex items-center justify-between w-full max-w-md mb-8 relative">
      {/* Connector line */}
      <div
        className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 z-0"
        style={{ background: "var(--gt-border-md)" }}
      />

      {steps.map((step, i) => {
        const isActive = phase === step;
        const isPast = activeIdx > i;

        return (
          <div key={step} className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={false}
              animate={{
                backgroundColor:
                  isActive || isPast ? "var(--gt-ink)" : "var(--gt-surface)",
                borderColor:
                  isActive || isPast ? "var(--gt-ink)" : "var(--gt-border-md)",
                scale: isActive ? 1.2 : 1,
              }}
              className="w-3 h-3 rounded-full border-2"
            />
            <span
              className="text-[10px] mt-2 font-bold uppercase"
              style={{
                color: isActive ? "var(--gt-t1)" : "var(--gt-t4)",
                letterSpacing: "-0.02em",
              }}
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
