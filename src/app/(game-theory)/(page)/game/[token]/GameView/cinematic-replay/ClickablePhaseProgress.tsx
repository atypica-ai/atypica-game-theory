"use client";

import { motion } from "motion/react";
import type { ReplayPhase } from "./useCinematicReplay";

const PHASE_STEPS = [
  { key: "discussion" as const, label: "Discussion" },
  { key: "analyze" as const, label: "Analyze" },
];

function phaseIdx(phase: ReplayPhase, steps: typeof PHASE_STEPS): number {
  if (phase === "completed") return steps.length;
  return steps.findIndex((s) => s.key === phase);
}

interface ClickablePhaseProgressProps {
  phase: ReplayPhase;
  hasDiscussion: boolean;
  onPhaseClick: (phase: "discussion" | "analyze") => void;
}

export function ClickablePhaseProgress({
  phase,
  hasDiscussion,
  onPhaseClick,
}: ClickablePhaseProgressProps) {
  const steps = hasDiscussion ? PHASE_STEPS : PHASE_STEPS.filter((s) => s.key !== "discussion");
  const current = phaseIdx(phase, steps);

  return (
    <div className="flex items-center justify-between w-full max-w-xs sm:max-w-md relative px-4 sm:px-0">
      <div
        className="absolute top-[6px] left-0 w-full h-px z-0"
        style={{ background: "var(--gt-border-md)" }}
      />
      {steps.map((step) => {
        const idx = phaseIdx(step.key, steps);
        const isCurrent = idx === current;
        const isPast = idx < current;
        const dotBg = isCurrent ? "var(--gt-indigo)" : isPast ? "var(--gt-done)" : "var(--gt-surface)";
        const dotBorder = isCurrent ? "var(--gt-indigo)" : isPast ? "var(--gt-done)" : "var(--gt-border-md)";
        const labelColor = isCurrent ? "var(--gt-indigo)" : isPast ? "var(--gt-t3)" : "var(--gt-t4)";

        return (
          <button
            key={step.key}
            onClick={() => onPhaseClick(step.key)}
            className="relative z-10 flex flex-col items-center cursor-pointer group"
          >
            <motion.div
              initial={false}
              animate={{
                backgroundColor: dotBg,
                borderColor: dotBorder,
                scale: isCurrent ? 1.3 : 1,
              }}
              className="w-3 h-3 rounded-full border-2 transition-shadow group-hover:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
            />
            <span
              className="text-[10px] mt-2 font-bold uppercase transition-colors group-hover:text-[var(--gt-indigo)]"
              style={{ color: labelColor, letterSpacing: "-0.02em" }}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
