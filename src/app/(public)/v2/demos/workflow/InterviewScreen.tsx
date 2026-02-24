"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { L } from "../theme";

/**
 * 1-on-1 Interview screen — mimics InterviewsView.
 * Top: persona header. Center: alternating Q&A messages. Bottom: input area.
 */
export default function InterviewScreen({
  personaSeed = 1042,
  personaName,
  personaMeta,
  question,
  answer,
}: {
  personaSeed?: number;
  personaName: string;
  personaMeta: string;
  question: string;
  answer: string;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = L.green;
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setShowAnswer(false);
    const timer = setTimeout(() => setShowAnswer(true), 1800);
    return () => clearTimeout(timer);
  }, [question]);

  return (
    <div className="flex flex-col h-full">
      {/* Persona header */}
      <div
        className="shrink-0 flex items-center gap-2.5 px-4 py-2.5"
        style={{ borderBottom: `1px solid ${L.borderLight}` }}
      >
        <HippyGhostAvatar seed={personaSeed} className="size-7 rounded-full" />
        <div>
          <span className="text-sm font-medium block" style={{ color: L.text }}>
            {personaName}
          </span>
          <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>
            {personaMeta}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accent }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
            {t("workflow.demos.ui.inProgress")}
          </span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {/* Interviewer question (left-aligned) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-2 max-w-[85%]"
        >
          <div
            className="w-5 h-5 rounded-full grid place-items-center shrink-0 mt-0.5"
            style={{ background: L.bgSub, border: `1px solid ${L.border}` }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={L.textMuted} strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="rounded-lg px-3 py-2" style={{ background: "white", border: `1px solid ${L.borderLight}` }}>
            <span className="font-IBMPlexMono text-xs block mb-1" style={{ color: L.textFaint }}>
              atypica.AI
            </span>
            <p className="text-sm leading-relaxed" style={{ color: L.text }}>{question}</p>
          </div>
        </motion.div>

        {/* Persona answer (right-aligned) */}
        <AnimatePresence>
          {showAnswer ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2 max-w-[85%] self-end flex-row-reverse"
            >
              <HippyGhostAvatar seed={personaSeed} className="size-5 rounded-full shrink-0 mt-0.5" />
              <div className="rounded-lg px-3 py-2" style={{ background: `${accent}08`, border: `1px solid ${accent}20` }}>
                <span className="font-IBMPlexMono text-xs block mb-1" style={{ color: accent }}>
                  {personaName}
                </span>
                <p className="text-sm leading-relaxed italic" style={{ color: L.text }}>
                  &ldquo;{answer}&rdquo;
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div className="flex items-center gap-1.5 self-end mr-7" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: accent }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom input area */}
      <div
        className="shrink-0 px-4 py-2.5 flex items-center gap-2"
        style={{ borderTop: `1px solid ${L.border}` }}
      >
        <div
          className="flex-1 h-8 rounded-lg px-3 flex items-center"
          style={{ background: "white", border: `1px solid ${L.border}` }}
        >
          <span className="text-xs" style={{ color: L.textFaint }}>
            {t("workflow.demos.ui.followUp")}
          </span>
        </div>
        {/* Voice button */}
        <div
          className="w-8 h-8 rounded-full grid place-items-center"
          style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
          </svg>
        </div>
      </div>
    </div>
  );
}
