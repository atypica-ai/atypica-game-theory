"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { L } from "../theme";

export type ConceptOption = {
  title: string;
  desc: string;
};

/**
 * Concept selection screen for Product R&D — user picks one concept from multiple options.
 * Shows animated concept cards, user selects one, then validation indicator appears.
 */
export default function ConceptSelectScreen({
  concepts,
  validationLabel,
}: {
  concepts: ConceptOption[];
  validationLabel: string;
}) {
  const accent = L.green;
  const [selected, setSelected] = useState(-1);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setSelected(-1);
    setValidating(false);
    const t1 = setTimeout(() => setSelected(0), 1500);
    const t2 = setTimeout(() => setValidating(true), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [concepts]);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="font-IBMPlexMono text-xs tracking-wider uppercase"
          style={{ color: L.textMuted }}
        >
          Select Concept
        </span>
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>
          {concepts.length} options
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {concepts.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3, duration: 0.3 }}
            className="flex items-start gap-3 py-2.5 px-3 rounded-lg cursor-default transition-colors"
            style={{
              background: i === selected ? `${accent}06` : "white",
              border: `1px solid ${i === selected ? `${accent}30` : L.borderLight}`,
            }}
          >
            {/* Radio indicator */}
            <div
              className="w-4 h-4 rounded-full border mt-0.5 shrink-0 grid place-items-center"
              style={{ borderColor: i === selected ? accent : L.border }}
            >
              {i === selected && (
                <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block" style={{ color: L.text }}>
                {c.title}
              </span>
              <span className="text-xs leading-relaxed" style={{ color: L.textMuted }}>
                {c.desc}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Validation indicator */}
      {validating && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 mt-3 flex items-center gap-2 p-2.5 rounded-lg"
          style={{ background: `${accent}06`, border: `1px solid ${accent}15` }}
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: accent }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <span className="text-xs" style={{ color: L.textMuted }}>
            {validationLabel}
          </span>
        </motion.div>
      )}
    </div>
  );
}
