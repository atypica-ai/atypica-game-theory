"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { L } from "../theme";

// Fake post data for scout browsing effect
const GRADIENT_PALETTES = [
  ["#f97316", "#eab308"],
  ["#ec4899", "#a855f7"],
  ["#3b82f6", "#06b6d4"],
  ["#10b981", "#14b8a6"],
  ["#f43f5e", "#fb923c"],
  ["#8b5cf6", "#6366f1"],
  ["#d946ef", "#ec4899"],
  ["#0ea5e9", "#22d3ee"],
];

function fakeEngagement(seed: number) {
  const base = ((seed * 7 + 13) % 90) + 10;
  return base >= 50 ? `${(base / 10).toFixed(1)}k` : `${base * 10}`;
}

const PLATFORM_ROWS = [
  { platform: "Instagram", icon: "📷", postCount: 5 },
  { platform: "TikTok", icon: "🎵", postCount: 4 },
  { platform: "Reddit", icon: "💬", postCount: 4 },
];

/**
 * Scout browsing screen — mimics SocialPostsResultMessage.
 * Shows horizontal scrollable rows of social media post cards, stacked vertically.
 * Each row represents a different platform search result.
 */
export default function ScoutScreen({
  postLabels,
}: {
  postLabels: [string, string, string];
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = L.green;
  const [visibleRows, setVisibleRows] = useState(0);
  const [signalCount, setSignalCount] = useState(847);

  // Stagger row appearance
  useEffect(() => {
    setVisibleRows(0);
    setSignalCount(847);
    const timers = PLATFORM_ROWS.map((_, i) =>
      setTimeout(() => setVisibleRows(i + 1), (i + 1) * 800),
    );
    return () => timers.forEach(clearTimeout);
  }, [postLabels]);

  // Increment signal count
  useEffect(() => {
    const id = setInterval(() => setSignalCount((c) => c + Math.floor(Math.random() * 3 + 1)), 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${L.borderLight}` }}>
        <motion.span
          className="w-2 h-2 rounded-full"
          style={{ background: accent }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
          {t("workflow.demos.ui.scouting")}
        </span>
        <span className="w-px h-3" style={{ background: L.border }} />
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
          {PLATFORM_ROWS.length} {t("workflow.demos.ui.platforms")}
        </span>
        <span className="w-px h-3" style={{ background: L.border }} />
        <motion.span
          className="font-IBMPlexMono text-xs tabular-nums"
          style={{ color: accent }}
          key={signalCount}
        >
          {signalCount}
        </motion.span>
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
          {t("workflow.demos.ui.signals")}
        </span>
      </div>

      {/* Post rows */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {PLATFORM_ROWS.map((row, ri) => (
          <motion.div
            key={row.platform}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: ri < visibleRows ? 1 : 0, y: ri < visibleRows ? 0 : 10 }}
            transition={{ duration: 0.4 }}
          >
            {/* Platform label */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs">{row.icon}</span>
              <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>
                exec search{row.platform}
              </span>
              <span className="font-IBMPlexMono text-xs ml-auto" style={{ color: accent }}>
                {row.postCount} results
              </span>
            </div>

            {/* Horizontal scrollable post cards */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: row.postCount }, (_, pi) => {
                const seed = ri * 10 + pi;
                const palette = GRADIENT_PALETTES[(ri * row.postCount + pi) % GRADIENT_PALETTES.length];
                return (
                  <div
                    key={pi}
                    className="shrink-0 w-[90px] rounded overflow-hidden"
                    style={{ background: "white", border: `1px solid ${L.borderLight}` }}
                  >
                    {/* Post image placeholder (gradient) */}
                    <div
                      className="w-full h-[70px]"
                      style={{ background: `linear-gradient(135deg, ${palette[0]}40, ${palette[1]}30)` }}
                    />
                    <div className="px-1.5 py-1.5">
                      <span className="font-IBMPlexMono text-xs block truncate" style={{ color: L.textSub, fontSize: "10px" }}>
                        user_{seed + 100}
                      </span>
                      <span className="text-xs block truncate mt-0.5" style={{ color: L.textFaint, fontSize: "10px" }}>
                        {postLabels[pi % 3]}
                      </span>
                      <span className="text-xs mt-1 block" style={{ color: L.textFaint, fontSize: "10px" }}>
                        ❤️ {fakeEngagement(seed)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* Loading indicator for next row */}
        {visibleRows < PLATFORM_ROWS.length && (
          <motion.div
            className="flex items-center gap-2 py-2"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: accent }}
            />
            <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>
              Searching next platform...
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
