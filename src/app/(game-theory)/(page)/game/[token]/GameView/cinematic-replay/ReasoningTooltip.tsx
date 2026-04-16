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
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const cancelTimers = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const handleEnter = useCallback(() => {
    cancelTimers();
    showTimerRef.current = setTimeout(() => {
      if (iconRef.current) {
        const rect = iconRef.current.getBoundingClientRect();
        setPos({
          top: rect.top,
          left: rect.left + rect.width / 2,
        });
      }
      setVisible(true);
    }, 200);
  }, [cancelTimers]);

  const handleLeave = useCallback(() => {
    cancelTimers();
    // Delayed hide — gives user time to move mouse to the tooltip
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 150);
  }, [cancelTimers]);

  // When mouse enters the tooltip itself, cancel the hide
  const handleTooltipEnter = useCallback(() => {
    cancelTimers();
  }, [cancelTimers]);

  // When mouse leaves the tooltip, hide
  const handleTooltipLeave = useCallback(() => {
    cancelTimers();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 100);
  }, [cancelTimers]);

  useEffect(() => {
    return () => cancelTimers();
  }, [cancelTimers]);

  return (
    <span
      ref={iconRef}
      className="inline-flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
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
            className="fixed z-[9999] w-[320px] max-h-[240px] overflow-y-auto rounded-md border p-3"
            style={{
              top: pos.top - 8,
              left: pos.left,
              transform: "translate(-50%, -100%)",
              background: "var(--gt-surface)",
              borderColor: color ? `${color}40` : "var(--gt-border)",
              borderLeft: color ? `3px solid ${color}` : undefined,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            }}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
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
