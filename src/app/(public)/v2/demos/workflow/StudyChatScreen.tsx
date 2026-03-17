"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { L } from "../theme";
import TypeText from "./TypeText";

export type ConsoleTool = {
  name: string;
  status: "done" | "running" | "pending";
  result?: string;
};

/**
 * Study Chat + Console split screen — mimics StudyPageClient.
 * Left: chat messages (user right-aligned + AI left-aligned). Right: Console with tool list.
 *
 * All content passed as props — no dynamic i18n key construction.
 */
export default function StudyChatScreen({
  userMsg,
  aiReply,
  tools,
}: {
  userMsg: string;
  aiReply: string;
  tools: ConsoleTool[];
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = L.green;
  const [visibleTools, setVisibleTools] = useState(0);

  useEffect(() => {
    setVisibleTools(0);
    const timers = tools.map((_, i) => setTimeout(() => setVisibleTools(i + 1), (i + 1) * 700));
    return () => timers.forEach(clearTimeout);
  }, [tools]);

  return (
    <div className="flex h-full">
      {/* Left: Chat */}
      <div className="flex-1 flex flex-col" style={{ borderRight: `1px solid ${L.border}` }}>
        <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
          <div
            className="self-end max-w-[80%] rounded-lg px-3 py-2 text-xs text-white"
            style={{ background: accent }}
          >
            {userMsg}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-start gap-2 max-w-[85%]"
          >
            <div
              className="w-5 h-5 rounded-full grid place-items-center shrink-0 mt-0.5"
              style={{ background: L.bgSub, border: `1px solid ${L.border}` }}
            >
              <span className="text-xs" style={{ color: L.textSub }}>
                A
              </span>
            </div>
            <div className="text-xs leading-relaxed" style={{ color: L.textMuted }}>
              <TypeText text={aiReply} speed={15} />
            </div>
          </motion.div>
        </div>
        <div
          className="shrink-0 px-3 py-2 flex items-center gap-2"
          style={{ borderTop: `1px solid ${L.border}` }}
        >
          <div
            className="flex-1 h-7 rounded px-2.5 flex items-center"
            style={{ background: "white", border: `1px solid ${L.border}` }}
          >
            <span className="text-xs" style={{ color: L.textFaint }}>
              {t("workflow.demos.ui.followUp")}
            </span>
          </div>
          <div className="w-6 h-6 rounded grid place-items-center" style={{ background: accent }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right: Console */}
      <div
        className="w-[140px] shrink-0 p-3 flex flex-col gap-1.5 max-sm:hidden"
        style={{ background: L.bgSub }}
      >
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase mb-1"
          style={{ color: L.textFaint }}
        >
          {t("workflow.demos.ui.console")}
        </span>
        {tools.map((tool, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: i < visibleTools ? 1 : 0, x: i < visibleTools ? 0 : 4 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-1.5"
          >
            {tool.status === "done" ? (
              <span className="text-xs mt-px shrink-0" style={{ color: L.textMuted }}>
                ✓
              </span>
            ) : tool.status === "running" ? (
              <motion.span
                className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                style={{ background: L.blue }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            ) : (
              <span
                className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                style={{ background: L.border }}
              />
            )}
            <div>
              <span className="font-IBMPlexMono text-xs block" style={{ color: L.text }}>
                {tool.name}
              </span>
              {tool.result && (
                <span className="font-IBMPlexMono text-xs block" style={{ color: L.textFaint }}>
                  {tool.result}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
