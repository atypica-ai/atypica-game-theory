"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { L } from "../theme";
import TypeText from "./TypeText";

export default function StudyInputScreen({
  question,
  refStudy,
}: {
  question: string;
  refStudy?: string;
}) {
  const t = useTranslations("HomeAtypicaV2");

  return (
    <div className="flex h-full items-center justify-center px-4 py-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-[360px] border"
        style={{ background: L.bgCard, borderColor: L.border }}
      >
        <div
          className="flex h-10 items-center justify-end border-b px-3"
          style={{ borderColor: L.borderLight }}
        >
          <div className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: L.textMuted }}>
            <span
              className="size-1.5 rounded-full"
              style={{ background: "var(--ghost-green)" }}
            />
            <span>{t("workflow.demos.ui.clarifyLink")}</span>
          </div>
        </div>

        {refStudy && (
          <div className="flex items-center gap-2 px-3 pt-3">
            <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: L.textFaint }}>
              {t("workflow.demos.ui.refLabel")}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{ background: L.bgSub, color: L.textSub, border: `1px solid ${L.border}` }}
            >
              @{refStudy}
            </span>
          </div>
        )}

        <div className="px-4 py-4">
          <div
            className="min-h-[122px] whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: L.text }}
          >
            <TypeText text={question} speed={22} />
          </div>
        </div>

        <div
          className="flex items-center gap-2 border-t px-3 py-3"
          style={{ borderColor: L.borderLight }}
        >
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md"
            style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}
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
            className="grid h-8 w-8 place-items-center rounded-md"
            style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}
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
            className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-black"
            style={{ background: "var(--ghost-green)" }}
            animate={{ opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            {t("workflow.demos.ui.sendButton")}
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
