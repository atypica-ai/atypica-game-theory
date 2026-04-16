"use client";

import { Brain } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ReasoningTooltipProps {
  reasoning: string;
  color?: string;
}

export function ReasoningTooltip({ reasoning, color }: ReasoningTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setPos({
          top: rect.top + window.scrollY,
          left: rect.left + rect.width / 2 + window.scrollX,
        });
      }
      setVisible(true);
    }, 200);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <span
      ref={iconRef}
      className="inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <Brain
        size={14}
        className="cursor-help transition-colors"
        style={{ color: visible ? (color ?? "var(--gt-t2)") : "var(--gt-t4)" }}
      />
      {visible &&
        pos &&
        createPortal(
          <div
            className="fixed z-[9999] w-[320px] max-h-[200px] overflow-y-auto rounded-md border p-3"
            style={{
              top: pos.top - 8,
              left: pos.left,
              transform: "translate(-50%, -100%)",
              background: "var(--gt-surface)",
              borderColor: color ? `${color}40` : "var(--gt-border)",
              borderLeft: color ? `3px solid ${color}` : undefined,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            }}
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            <p
              className="text-[9px] font-bold uppercase mb-1.5"
              style={{
                letterSpacing: "0.1em",
                color: "var(--gt-t4)",
                fontFamily: "IBMPlexMono, monospace",
              }}
            >
              Inner Thinking
            </p>
            <p
              className="text-[12px] leading-relaxed"
              style={{
                color: "var(--gt-t3)",
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
              }}
            >
              {reasoning}
            </p>
          </div>,
          document.body,
        )}
    </span>
  );
}
