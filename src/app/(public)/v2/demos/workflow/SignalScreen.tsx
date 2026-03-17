"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { L } from "../theme";

export type SignalSource = { name: string; value: string; up: boolean };
export type SignalBar = { label: string; strength: number };

/**
 * Signal Tape Dashboard. All data passed as props — no dynamic key construction.
 */
export default function SignalScreen({
  sources,
  signals,
  trending,
}: {
  sources: SignalSource[];
  signals: SignalBar[];
  trending: string;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = L.green;
  const [tick, setTick] = useState(0);
  const [signalCount, setSignalCount] = useState(0);

  useEffect(() => {
    setTick(0);
    setSignalCount(0);
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setSignalCount((c) => c + Math.floor(Math.random() * 5 + 2));
    }, 800);
    return () => clearInterval(id);
  }, [sources]);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center gap-2.5">
        <motion.span
          className="w-2 h-2 rounded-full"
          style={{ background: accent }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
          {t("workflow.demos.ui.live")}
        </span>
        <span className="w-px h-3" style={{ background: L.border }} />
        <span className="font-IBMPlexMono text-xs tabular-nums" style={{ color: L.textMuted }}>
          {sources.length} sources
        </span>
        <span className="w-px h-3" style={{ background: L.border }} />
        <motion.span
          className="font-IBMPlexMono text-xs tabular-nums"
          style={{ color: L.textMuted }}
          key={signalCount}
        >
          {847 + signalCount}
        </motion.span>
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
          {t("workflow.demos.ui.signals")}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 max-sm:grid-cols-2">
        {sources.map((src) => (
          <div
            key={src.name}
            className="px-2 py-1.5 rounded"
            style={{ background: "white", border: `1px solid ${L.borderLight}` }}
          >
            <span className="font-IBMPlexMono text-xs block" style={{ color: L.textFaint }}>
              {src.name}
            </span>
            <span
              className="font-IBMPlexMono text-sm font-medium"
              style={{ color: src.up ? L.text : "#dc2626" }}
            >
              {src.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        {signals.map((s) => {
          const jitter = Math.sin(tick * 0.5 + s.strength * 10) * 0.06;
          const w = Math.max(0.1, Math.min(1, s.strength + jitter));
          return (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className="font-IBMPlexMono text-xs w-24 text-right shrink-0 truncate"
                style={{ color: L.textMuted }}
              >
                {s.label}
              </span>
              <div
                className="flex-1 h-2.5 relative overflow-hidden rounded-sm"
                style={{ background: L.bgSub }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{ background: `${accent}35` }}
                  animate={{ width: `${w * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span
                className="font-IBMPlexMono text-xs w-6 shrink-0 tabular-nums"
                style={{ color: L.textMuted }}
              >
                {Math.round(w * 100)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="shrink-0 pt-2 flex items-center gap-2"
        style={{ borderTop: `1px solid ${L.border}` }}
      >
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: L.textFaint }}
        >
          {t("workflow.demos.ui.trending")}
        </span>
        <span className="text-xs truncate" style={{ color: L.text }}>
          {trending}
        </span>
      </div>
    </div>
  );
}
