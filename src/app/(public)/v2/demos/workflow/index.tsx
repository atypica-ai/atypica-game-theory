"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ProductFrame, { BreadcrumbSegment, BreadcrumbSeparator } from "../ProductFrame";
import { L } from "../theme";
import { FLOWS } from "./flows";

const pageVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

/**
 * WorkflowDemo — ProductFrame-based interactive demo player.
 * Replaces the old MockupPlayer + AppChrome.
 * Auto-cycles through screens with click-to-advance.
 */
export default function WorkflowDemo({ goalKey }: { goalKey: string }) {
  const flow = FLOWS[goalKey] ?? FLOWS.consumerInsight;
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const advanceStep = useCallback(() => {
    setStep((s) => (s + 1) % flow.steps.length);
  }, [flow.steps.length]);

  // Reset on goal change
  useEffect(() => {
    setStep(0);
  }, [goalKey]);

  // Auto-advance with per-step duration
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(advanceStep, flow.steps[step].duration);
    return () => clearTimeout(timerRef.current);
  }, [goalKey, step, flow, advanceStep]);

  const current = flow.steps[step];
  const totalSteps = flow.steps.length;

  return (
    <ProductFrame
      className="h-[440px]"
      sidebarActiveIndex={current.sidebarActive}
      accentColor={L.green}
      breadcrumb={
        <>
          <BreadcrumbSegment text={current.breadcrumb[0]} />
          <BreadcrumbSeparator />
          <BreadcrumbSegment text={current.breadcrumb[1]} active />
        </>
      }
    >
      <div className="h-full flex flex-col cursor-pointer" onClick={advanceStep}>
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${goalKey}-${step}`}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="h-full"
            >
              {current.render()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="shrink-0 h-0.5" style={{ background: L.border }}>
          <motion.div
            className="h-full"
            style={{ background: L.green }}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </ProductFrame>
  );
}
