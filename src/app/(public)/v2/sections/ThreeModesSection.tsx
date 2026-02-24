"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, WORKFLOW_GOALS } from "../content";
import WorkflowDemo from "../demos/workflow";

const copy = CHAPTERS[3];

/* ═══════════════════════════════════════════════
   Section: Use Cases × Workflow (Chapter 04)
   Full-width demo on top + use case selector grid below
   ═══════════════════════════════════════════════ */

export default function ThreeModesSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const [activeGoal, setActiveGoal] = useState(0);

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="mb-10">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
            {t("workflow.kicker")}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {t("workflow.title")}
          </h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">
            {t("workflow.body")}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {/* Full-width demo area */}
          <div className="border border-zinc-700 overflow-hidden rounded-lg mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={WORKFLOW_GOALS[activeGoal].key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <WorkflowDemo goalKey={WORKFLOW_GOALS[activeGoal].key} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Use case selector grid — desktop: 4×2, mobile: horizontal scroll */}
          <div className="grid grid-cols-4 gap-2 max-lg:grid-cols-2 max-sm:flex max-sm:overflow-x-auto max-sm:gap-2 max-sm:pb-2">
            {WORKFLOW_GOALS.map((g, i) => (
              <button
                key={g.key}
                type="button"
                className={cn(
                  "border px-3 py-2.5 text-left cursor-pointer transition-all duration-200 bg-transparent max-sm:shrink-0 max-sm:w-[160px]",
                  activeGoal === i
                    ? "border-zinc-600 bg-zinc-800/80"
                    : "border-zinc-800 hover:border-zinc-700",
                )}
                onClick={() => setActiveGoal(i)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: g.accent }}
                  />
                  <span
                    className={cn(
                      "font-IBMPlexMono text-xs tracking-[0.04em] font-medium transition-colors duration-200 truncate",
                      activeGoal === i ? "text-zinc-100" : "text-zinc-400",
                    )}
                  >
                    {t(`workflow.goals.${g.key}.label`)}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-xs leading-relaxed mt-1 pl-[14px] transition-colors duration-200 line-clamp-2 max-sm:hidden",
                    activeGoal === i ? "text-zinc-400" : "text-zinc-600",
                  )}
                >
                  {t(`workflow.goals.${g.key}.desc`)}
                </p>
              </button>
            ))}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
