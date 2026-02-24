"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import {
  CHAPTERS,
  PERSONA_DIMENSIONS,
  PERSONA_TAG_KEYS,
  RESEARCHER_METHOD_KEYS,
  SIMULATOR_PERSONA_KEYS,
} from "../content";

const copy = CHAPTERS[2];

/* ── Simulator Mockup: Persona Building Process ── */

function SimulatorMockup() {
  const t = useTranslations("HomeAtypicaV2");
  const [step, setStep] = useState(0);
  const [showPersona, setShowPersona] = useState(false);

  const buildSteps = [
    t("twoAgents.mockup.stepParse"),
    t("twoAgents.mockup.stepAnalyze"),
    t("twoAgents.mockup.stepGenerate"),
  ];

  useEffect(() => {
    // Cycle: step0 → step1 → step2 → show persona → pause → reset
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setStep(0);
      setShowPersona(false);
      timers.push(setTimeout(() => setStep(1), 1200));
      timers.push(setTimeout(() => setStep(2), 2400));
      timers.push(setTimeout(() => setShowPersona(true), 3600));
      timers.push(setTimeout(run, 8000));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* 3-step progress */}
      <div className="flex items-center gap-1.5">
        {buildSteps.map((label, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full grid place-items-center text-xs font-IBMPlexMono transition-colors duration-500",
                i < step
                  ? "bg-[#1bff1b]/30 text-[#1bff1b]"
                  : i === step
                    ? "bg-[#1bff1b]/15 text-[#1bff1b] animate-pulse"
                    : "bg-zinc-800 text-zinc-600",
              )}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={cn(
                "font-IBMPlexMono text-xs tracking-wide transition-colors duration-500",
                i <= step ? "text-zinc-300" : "text-zinc-600",
              )}
            >
              {label}
            </span>
            {i < buildSteps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px transition-colors duration-500",
                  i < step ? "bg-[#1bff1b]/30" : "bg-zinc-800",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Persona card reveal */}
      <AnimatePresence mode="wait">
        {showPersona ? (
          <motion.div
            key="persona"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="border border-[rgba(27,255,27,0.15)] bg-[rgba(27,255,27,0.03)] p-3"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-full bg-[rgba(27,255,27,0.12)] border border-[rgba(27,255,27,0.25)] grid place-items-center text-xs text-[#1bff1b]">
                AI
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-200">
                  {t("twoAgents.mockup.personaName")}
                </div>
                <div className="font-IBMPlexMono text-xs text-zinc-500">
                  {t("twoAgents.mockup.personaMeta")}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-2.5">
              {PERSONA_TAG_KEYS.map((key) => (
                <span
                  key={key}
                  className="py-0.5 px-2 font-IBMPlexMono text-xs border border-[rgba(27,255,27,0.2)] text-[rgba(27,255,27,0.6)]"
                >
                  {t(`twoAgents.mockup.${key}`)}
                </span>
              ))}
            </div>
            {/* Mini dimension bars */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
              {PERSONA_DIMENSIONS.map((d) => (
                <div key={d.key} className="flex items-center gap-1.5">
                  <span className="font-IBMPlexMono text-xs text-zinc-500 w-14 shrink-0">
                    {t(`twoAgents.mockup.${d.key}`)}
                  </span>
                  <div className="flex-1 h-1 bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-[#1bff1b]/40"
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.score / 3) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="building"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border border-zinc-800 bg-zinc-800/30 p-3 space-y-2.5"
          >
            {/* Skeleton lines with stagger animation */}
            {[0.7, 0.5, 0.85].map((w, i) => (
              <motion.div
                key={i}
                className="h-1.5 rounded-sm bg-zinc-700/50"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                style={{ width: `${w * 100}%` }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Researcher Mockup: Live Interview ── */

function ResearcherMockup() {
  const t = useTranslations("HomeAtypicaV2");
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);

  const messages = [
    { role: "researcher" as const, text: t("twoAgents.mockup.interviewQ1") },
    { role: "persona" as const, text: t("twoAgents.mockup.interviewA1") },
    { role: "researcher" as const, text: t("twoAgents.mockup.interviewQ2") },
    { role: "persona" as const, text: t("twoAgents.mockup.interviewA2") },
  ];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setVisibleCount(0);
      setTyping(false);

      messages.forEach((_, i) => {
        timers.push(setTimeout(() => setTyping(true), i * 1800 + 400));
        timers.push(
          setTimeout(
            () => {
              setVisibleCount(i + 1);
              setTyping(false);
            },
            i * 1800 + 1200,
          ),
        );
      });
      // Reset cycle
      timers.push(setTimeout(run, messages.length * 1800 + 3000));
    };
    run();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-0.5 bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full bg-[#93c5fd]/50"
            animate={{ width: `${(visibleCount / messages.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="font-IBMPlexMono text-xs text-zinc-500">
          {visibleCount}/{messages.length}
        </span>
      </div>

      {/* Chat messages — sliding window: show max 3 at a time */}
      {messages.slice(Math.max(0, visibleCount - 3), visibleCount).map((msg, i) => (
        <motion.div
          key={Math.max(0, visibleCount - 3) + i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "py-1.5 px-2 rounded-sm max-w-[82%] text-xs leading-relaxed",
            msg.role === "researcher"
              ? "self-start bg-[rgba(147,197,253,0.12)] border border-[rgba(147,197,253,0.2)] text-zinc-300"
              : "self-end bg-zinc-800 border border-zinc-700 text-zinc-400",
          )}
        >
          {msg.text}
        </motion.div>
      ))}

      {/* Typing indicator */}
      {typing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "py-1.5 px-2.5 rounded-lg max-w-[82%] flex gap-1",
            visibleCount % 2 === 0
              ? "self-start bg-[rgba(147,197,253,0.08)]"
              : "self-end bg-zinc-800/50",
          )}
        >
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="w-1 h-1 rounded-full bg-zinc-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.2 }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ── Section ── */

export default function TwoAgentsSection({
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
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
            {t("twoAgents.kicker")}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {t("twoAgents.title")}
          </h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">
            {t("twoAgents.body")}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
            {/* Simulator card */}
            <div className="border border-zinc-800 p-7">
              <h3 className="font-IBMPlexMono text-lg tracking-[0.08em] uppercase mb-2 text-[#1bff1b]">
                {t("twoAgents.simulator.tag")}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400 mb-5">
                {t("twoAgents.simulator.description")}
              </p>

              {/* Animated persona building mockup */}
              <div className="mb-4 border border-zinc-800 bg-zinc-900 min-h-[195px] overflow-hidden">
                <SimulatorMockup />
              </div>

              <div className="grid gap-2">
                {SIMULATOR_PERSONA_KEYS.map((personaKey) => (
                  <div
                    key={personaKey}
                    className="border border-zinc-800 p-3 px-4 transition-colors duration-200 hover:border-zinc-600"
                  >
                    <div className="text-sm font-medium">
                      {t(`twoAgents.simulator.${personaKey}.label`)}
                    </div>
                    <div className="text-sm leading-normal text-zinc-300 mt-1">
                      {t(`twoAgents.simulator.${personaKey}.description`)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Researcher card */}
            <div className="border border-zinc-800 p-7">
              <h3 className="font-IBMPlexMono text-lg tracking-[0.08em] uppercase mb-2 text-[#93c5fd]">
                {t("twoAgents.researcher.tag")}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400 mb-5">
                {t("twoAgents.researcher.description")}
              </p>

              {/* Animated interview mockup */}
              <div className="mb-4 border border-zinc-800 bg-zinc-900 min-h-[195px] overflow-hidden">
                <ResearcherMockup />
              </div>

              <div className="grid gap-1.5">
                {RESEARCHER_METHOD_KEYS.map((methodKey, i) => (
                  <div
                    key={methodKey}
                    className="flex items-center gap-2.5 border border-zinc-800 py-2.5 px-3.5 text-sm transition-colors duration-200 hover:border-zinc-600"
                  >
                    <span className="font-IBMPlexMono text-xs text-zinc-300 min-w-[18px]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{t(`twoAgents.researcher.${methodKey}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
