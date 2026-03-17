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
  const [visibleTools, setVisibleTools] = useState(0);

  useEffect(() => {
    setVisibleTools(0);
    const timers = tools.map((_, index) =>
      setTimeout(() => setVisibleTools(index + 1), (index + 1) * 650),
    );
    return () => timers.forEach(clearTimeout);
  }, [tools]);

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: L.borderLight, background: L.bgCard }}
      >
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
          Study Workspace
        </span>
        <div className="inline-flex items-center gap-2 text-[11px]" style={{ color: L.textMuted }}>
          <span
            className="size-1.5 rounded-full"
            style={{ background: "var(--ghost-green)" }}
          />
          <span>{t("workflow.demos.ui.inProgress")}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-[360px]">
          <div className="flex justify-end">
            <div
              className="max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed text-white"
              style={{ background: L.text }}
            >
              {userMsg}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-5"
          >
            <div className="text-center">
              <div
                className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px]"
                style={{ background: L.bgSub, color: L.textMuted, border: `1px solid ${L.border}` }}
              >
                <span className="size-1.5 rounded-full" style={{ background: "var(--ghost-green)" }} />
                atypica.AI
              </div>
            </div>
            <div className="mt-4 px-2 text-center text-base leading-relaxed font-medium" style={{ color: L.text }}>
              <TypeText text={aiReply} speed={15} />
            </div>
          </motion.div>

          <div className="mt-6 space-y-2">
            {tools.map((tool, index) => (
              <motion.div
                key={`${tool.name}-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: index < visibleTools ? 1 : 0,
                  y: index < visibleTools ? 0 : 6,
                }}
                transition={{ duration: 0.24 }}
                className="rounded-lg px-3 py-2.5"
                style={{ background: L.bgCard, border: `1px solid ${L.borderLight}` }}
              >
                <div className="flex items-start gap-2">
                  {tool.status === "done" ? (
                    <span className="mt-1 size-1.5 rounded-full" style={{ background: "var(--ghost-green)" }} />
                  ) : tool.status === "running" ? (
                    <motion.span
                      className="mt-1 size-1.5 rounded-full"
                      style={{ background: L.blue }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.7, repeat: Infinity }}
                    />
                  ) : (
                    <span className="mt-1 size-1.5 rounded-full" style={{ background: L.border }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-IBMPlexMono text-xs" style={{ color: L.text }}>
                        {tool.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: L.textFaint }}>
                        {tool.status}
                      </span>
                    </div>
                    {tool.result && (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: L.textMuted }}>
                        {tool.result}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="border-t px-4 py-3"
        style={{ borderColor: L.borderLight, background: L.bgCard }}
      >
        <div
          className="mx-auto flex max-w-[360px] items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: L.border, background: L.bg }}
        >
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ background: L.bgSub }}
          >
            <svg
              width="12"
              height="12"
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
          <span className="flex-1 text-xs" style={{ color: L.textFaint }}>
            {t("workflow.demos.ui.followUp")}
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: "var(--ghost-green)" }}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
