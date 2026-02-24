"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { L } from "../theme";

export type SelectPersona = { seed: number; name: string; role: string };

/**
 * Persona/scenario selection screen. All data passed as props.
 */
export default function SelectScreen({
  title,
  desc,
  personas,
  buttonText,
}: {
  title: string;
  desc: string;
  personas: SelectPersona[];
  buttonText: string;
}) {
  const accent = L.green;
  const [selected, setSelected] = useState(-1);

  useEffect(() => {
    setSelected(-1);
    const timer = setTimeout(() => setSelected(0), 1200);
    return () => clearTimeout(timer);
  }, [title]);

  return (
    <div className="flex flex-col h-full px-5 py-4">
      <span className="font-IBMPlexMono text-xs tracking-wider uppercase mb-1" style={{ color: L.textMuted }}>{title}</span>
      <span className="text-sm mb-4" style={{ color: L.textFaint }}>{desc}</span>

      <div className="flex-1 flex flex-col gap-2">
        {personas.map((p, i) => (
          <motion.div
            key={p.seed}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors cursor-default"
            style={{
              background: i === selected ? `${accent}06` : "white",
              border: `1px solid ${i === selected ? `${accent}30` : L.borderLight}`,
            }}
          >
            <HippyGhostAvatar seed={p.seed} className="size-8 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block" style={{ color: L.text }}>{p.name}</span>
              <span className="text-xs" style={{ color: L.textMuted }}>{p.role}</span>
            </div>
            <div className="w-4 h-4 rounded-full border shrink-0"
              style={{ borderColor: i === selected ? accent : L.border, background: i === selected ? accent : "transparent" }}>
              {i === selected && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div className="shrink-0 mt-3 self-end px-4 py-1.5 text-xs font-medium rounded text-white"
        style={{ background: accent }} initial={{ opacity: 0 }} animate={{ opacity: selected >= 0 ? 1 : 0.4 }} transition={{ duration: 0.3 }}>
        {buttonText} →
      </motion.div>
    </div>
  );
}
