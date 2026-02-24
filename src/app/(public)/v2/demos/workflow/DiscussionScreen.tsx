"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { L } from "../theme";

export type DiscussionEvent = {
  type: "moderator" | "persona" | "summary";
  seed?: number;
  name?: string;
  text: string;
};

const DEFAULT_PERSONAS = [
  { seed: 1042, name: "#1042" },
  { seed: 387, name: "#387" },
  { seed: 2156, name: "#2156" },
  { seed: 891, name: "#891" },
  { seed: 1523, name: "#1523" },
  { seed: 604, name: "#604" },
];

/**
 * Discussion screen — mimics DiscussionView 3-column layout.
 * All event data passed as props — no dynamic i18n key construction.
 */
export default function DiscussionScreen({
  personas = DEFAULT_PERSONAS,
  events,
}: {
  personas?: { seed: number; name: string }[];
  events: DiscussionEvent[];
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = L.green;
  const [msgCount, setMsgCount] = useState(0);
  const [participated, setParticipated] = useState<Set<number>>(new Set());

  useEffect(() => {
    setMsgCount(0);
    setParticipated(new Set());
    const timers = events.map((evt, i) =>
      setTimeout(() => {
        setMsgCount(i + 1);
        if (evt.type === "persona" && evt.seed) {
          setParticipated((prev) => new Set([...prev, evt.seed!]));
        }
      }, (i + 1) * 1000),
    );
    return () => timers.forEach(clearTimeout);
  }, [events]);

  return (
    <div className="flex h-full">
      {/* Left: participant avatars */}
      <div
        className="w-[52px] shrink-0 py-2.5 px-1.5 flex flex-col gap-1.5 items-center"
        style={{ borderRight: `1px solid ${L.border}` }}
      >
        <span className="font-IBMPlexMono mb-1" style={{ color: L.textFaint, fontSize: "9px" }}>
          {participated.size}/{personas.length}
        </span>
        {personas.map((p) => (
          <div key={p.seed} className="relative">
            <HippyGhostAvatar seed={p.seed} className="size-5 rounded-full" />
            <span
              className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border")}
              style={{
                borderColor: L.bg,
                background: participated.has(p.seed) ? "#16a34a" : L.border,
              }}
            />
          </div>
        ))}
      </div>

      {/* Center: timeline */}
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accent }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
            {t("workflow.demos.ui.inProgress")}
          </span>
          <span className="font-IBMPlexMono text-xs ml-auto tabular-nums" style={{ color: L.textFaint }}>
            {msgCount}/{events.length}
          </span>
        </div>

        {events.slice(0, msgCount).map((evt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="py-1.5 px-2 text-xs leading-relaxed rounded"
            style={{
              background:
                evt.type === "moderator" ? `${accent}08` :
                evt.type === "summary" ? L.bgSub : "transparent",
              border:
                evt.type === "moderator" ? `1px solid ${accent}20` :
                evt.type === "summary" ? `1px solid ${L.border}` : "none",
              color: evt.type === "summary" ? L.textMuted : L.text,
              fontStyle: evt.type === "summary" ? "italic" : "normal",
            }}
          >
            <span className="font-IBMPlexMono text-xs mr-1" style={{ color: L.textMuted }}>
              {evt.type === "moderator" && "🎙 "}
              {evt.type === "summary" && "📋 "}
              {evt.type === "persona" && evt.seed && (
                <HippyGhostAvatar seed={evt.seed} className="size-3.5 rounded-full inline-block align-text-bottom mr-0.5" />
              )}
              {evt.type === "moderator" ? "Moderator" : evt.type === "persona" ? evt.name : "Summary"}:
            </span>
            {evt.text}
          </motion.div>
        ))}
      </div>

      {/* Right: analysis panel (hidden on small containers) */}
      <div
        className="w-[110px] shrink-0 p-2.5 flex flex-col gap-2 max-md:hidden"
        style={{ borderLeft: `1px solid ${L.border}`, background: L.bgSub }}
      >
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint, fontSize: "10px" }}>
          Analysis
        </span>

        {/* Progress bar */}
        <div>
          <span className="font-IBMPlexMono text-xs block mb-1" style={{ color: L.textMuted, fontSize: "10px" }}>
            Progress
          </span>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: L.border }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: accent }}
              animate={{ width: `${(msgCount / events.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Summary (shows after last event) */}
        {msgCount >= events.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs leading-relaxed mt-1"
            style={{ color: L.textMuted, fontSize: "10px" }}
          >
            {t("workflow.demos.ui.complete")} ✓
          </motion.div>
        )}
      </div>
    </div>
  );
}
