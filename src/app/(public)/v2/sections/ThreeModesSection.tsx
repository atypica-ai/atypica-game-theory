"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
  const goalCards = [
    {
      key: "consumerInsight",
      accent: WORKFLOW_GOALS[0].accent,
      label: t("workflow.goals.consumerInsight.label"),
      desc: t("workflow.goals.consumerInsight.desc"),
      href: `/newstudy?brief=${encodeURIComponent(t("workflow.demos.consumerInsight.question"))}`,
    },
    {
      key: "conceptTesting",
      accent: WORKFLOW_GOALS[1].accent,
      label: t("workflow.goals.conceptTesting.label"),
      desc: t("workflow.goals.conceptTesting.desc"),
      href: `/newstudy?brief=${encodeURIComponent(t("workflow.demos.conceptTesting.question"))}`,
    },
    {
      key: "productRnD",
      accent: WORKFLOW_GOALS[2].accent,
      label: t("workflow.goals.productRnD.label"),
      desc: t("workflow.goals.productRnD.desc"),
      href: `/newstudy?brief=${encodeURIComponent(t("workflow.demos.productRnD.question"))}`,
    },
    {
      key: "uxVoc",
      accent: WORKFLOW_GOALS[3].accent,
      label: t("workflow.goals.uxVoc.label"),
      desc: t("workflow.goals.uxVoc.desc"),
      href: "/panel",
    },
    {
      key: "salesTraining",
      accent: WORKFLOW_GOALS[4].accent,
      label: t("workflow.goals.salesTraining.label"),
      desc: t("workflow.goals.salesTraining.desc"),
      href: "/panel",
    },
    {
      key: "pricingAttribution",
      accent: WORKFLOW_GOALS[5].accent,
      label: t("workflow.goals.pricingAttribution.label"),
      desc: t("workflow.goals.pricingAttribution.desc"),
      href: `/newstudy?brief=${encodeURIComponent(t("workflow.demos.pricingAttribution.question"))}`,
    },
    {
      key: "academicResearch",
      accent: WORKFLOW_GOALS[6].accent,
      label: t("workflow.goals.academicResearch.label"),
      desc: t("workflow.goals.academicResearch.desc"),
      href: "/panel",
    },
    {
      key: "investmentPrediction",
      accent: WORKFLOW_GOALS[7].accent,
      label: t("workflow.goals.investmentPrediction.label"),
      desc: t("workflow.goals.investmentPrediction.desc"),
      href: "/docs/mcp",
    },
  ] as const;

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="mb-10">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-ghost-green mb-4">
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
                key={goalCards[activeGoal].key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <WorkflowDemo goalKey={goalCards[activeGoal].key} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Use case selector grid — desktop: 4×2, mobile: horizontal scroll */}
          <div className="grid grid-cols-4 gap-2 max-lg:grid-cols-2 max-sm:flex max-sm:overflow-x-auto max-sm:gap-2 max-sm:pb-2">
            {goalCards.map((card, i) => (
              <div
                key={card.key}
                className={cn(
                  "border bg-transparent transition-all duration-200 max-sm:shrink-0 max-sm:w-[160px]",
                  activeGoal === i
                    ? "border-zinc-600 bg-zinc-800/80"
                    : "border-zinc-800 hover:border-zinc-700",
                )}
              >
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    onClick={() => setActiveGoal(i)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: card.accent }}
                      />
                      <span
                        className={cn(
                          "font-IBMPlexMono text-xs tracking-[0.04em] font-medium transition-colors duration-200 truncate",
                          activeGoal === i ? "text-zinc-100" : "text-zinc-400",
                        )}
                      >
                        {card.label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-xs leading-relaxed mt-1 pl-[14px] pr-2 transition-colors duration-200 line-clamp-2 max-sm:hidden",
                        activeGoal === i ? "text-zinc-400" : "text-zinc-600",
                      )}
                    >
                      {card.desc}
                    </p>
                  </button>

                  <Link
                    href={card.href}
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors duration-200",
                      activeGoal === i
                        ? "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                        : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400",
                    )}
                    aria-label={t("workflow.openInProduct")}
                  >
                    ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
