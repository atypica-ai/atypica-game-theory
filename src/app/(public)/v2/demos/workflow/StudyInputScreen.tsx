"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { L } from "../theme";
import TypeText from "./TypeText";

/**
 * Realistic New Study input screen — mimics the real /newstudy page.
 * Centered layout: title with CommandIcon + centered narrow input box + toolbar.
 * NOT full-width — the input sits in a narrow centered column with grid background.
 */
export default function StudyInputScreen({
  question,
  refStudy,
}: {
  question: string;
  refStudy?: string;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = L.green;

  return (
    <div
      className="h-full flex flex-col items-center justify-center"
      style={{
        backgroundImage: `radial-gradient(circle, ${L.border}40 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Title with CommandIcon */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 mb-5"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={L.text}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z" />
        </svg>
        <span className="text-sm font-medium" style={{ color: L.text }}>
          {t("workflow.demos.ui.startStudy")}
        </span>
      </motion.div>

      {/* Centered input container (narrow, like real /newstudy page) */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="w-full max-w-[300px] px-3"
      >
        {/* Reference tag */}
        {refStudy && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs" style={{ color: L.textFaint }}>
              {t("workflow.demos.ui.refLabel")}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${accent}10`, border: `1px solid ${accent}25`, color: accent }}
            >
              @{refStudy}
            </span>
          </div>
        )}

        {/* Input box with integrated toolbar */}
        <div
          className="rounded-lg overflow-hidden shadow-sm"
          style={{ background: "white", border: `1px solid ${L.border}` }}
        >
          {/* Clarify link */}
          <div className="flex items-center gap-1.5 px-3 pt-2.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 3l1.912 5.813L20 10.5l-4.874 3.687L17 20l-5-3.5L7 20l1.874-5.813L4 10.5l6.088-1.687z" />
            </svg>
            <span style={{ color: accent, fontSize: "10px" }}>
              {t("workflow.demos.ui.clarifyLink")}
            </span>
          </div>

          {/* Textarea area */}
          <div className="px-3 py-2 min-h-[56px] text-sm leading-relaxed" style={{ color: L.text }}>
            <TypeText text={question} speed={25} />
          </div>

          {/* Bottom toolbar */}
          <div
            className="flex items-center gap-1.5 px-3 py-2"
            style={{ borderTop: `1px solid ${L.borderLight}` }}
          >
            <button
              type="button"
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: L.bgSub }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={L.textMuted}
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              type="button"
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: L.bgSub }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={L.textMuted}
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
              </svg>
            </button>
            <div className="flex-1" />
            <motion.button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: accent }}
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {t("workflow.demos.ui.sendButton")}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-center mt-2" style={{ color: L.textFaint, fontSize: "10px" }}>
          Enter to start
        </p>
      </motion.div>
    </div>
  );
}
