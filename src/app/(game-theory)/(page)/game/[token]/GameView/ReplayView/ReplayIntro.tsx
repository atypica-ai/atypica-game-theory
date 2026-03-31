"use client";

import { GameSessionParticipant } from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState } from "react";
import { PLAYER_COLORS } from "../PlayerCard";

interface ReplayIntroProps {
  gameTypeName: string;
  participants: GameSessionParticipant[];
  onStart: () => void;
}

type Stage = "title" | "arena" | "ready";

export function ReplayIntro({ gameTypeName, participants, onStart }: ReplayIntroProps) {
  const [stage, setStage] = useState<Stage>("title");
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (stage !== "title") return;
    const t = setTimeout(() => setStage("arena"), 700);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== "arena") return;
    const delay = participants.length * 250 + 500;
    const t = setTimeout(() => setStage("ready"), delay);
    return () => clearTimeout(t);
  }, [stage, participants.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDismissed) setStage("ready");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isDismissed]);

  const dismiss = () => {
    if (isDismissed) return;
    setIsDismissed(true);
    setTimeout(onStart, 300);
  };

  const isTwoPlayer = participants.length === 2;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col select-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: "var(--gt-bg)" }}
        >
          {/* Header */}
          <div
            className="border-b"
            style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
          >
            <div className="mx-auto flex items-center justify-between h-[60px] px-8" style={{ maxWidth: "1200px" }}>
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px]"
                  style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                >
                  Game Theory Lab
                </span>
                <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
                <span
                  className="text-[15px] font-[600]"
                  style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
                >
                  {gameTypeName}
                </span>
              </div>
              <span
                className="text-[12px] px-3 py-1 border"
                style={{
                  borderRadius: "9999px",
                  color: "var(--gt-blue)",
                  borderColor: "var(--gt-blue-border)",
                  background: "var(--gt-blue-bg)",
                  fontFamily: "IBMPlexMono, monospace",
                  letterSpacing: "0.06em",
                }}
              >
                Replay
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8">

            {/* "Arena" label */}
            <AnimatePresence>
              {stage !== "title" && (
                <motion.span
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="text-[11px] uppercase"
                  style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.2em" }}
                >
                  Arena
                </motion.span>
              )}
            </AnimatePresence>

            {/* Player cards */}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {participants.map((participant, idx) => {
                const color = PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
                return (
                  <React.Fragment key={participant.personaId}>
                    {isTwoPlayer && idx === 1 && stage !== "title" && (
                      <div className="flex flex-col items-center gap-1 px-2 self-stretch justify-center">
                        <div className="flex-1 w-px" style={{ background: "var(--gt-border-md)" }} />
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                        >
                          vs
                        </span>
                        <div className="flex-1 w-px" style={{ background: "var(--gt-border-md)" }} />
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={stage !== "title" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                      transition={{ duration: 0.4, delay: idx * 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col items-center gap-4 w-52 border"
                      style={{
                        background: "var(--gt-surface)",
                        border: "1px solid var(--gt-border)",
                        borderRadius: "0.375rem",
                        borderTop: `3px solid ${color}`,
                        padding: "1.75rem 1.5rem",
                      }}
                    >
                      <HippyGhostAvatar seed={participant.personaId} className="size-16 rounded-full" />
                      <span
                        className="text-[16px] font-[600] text-center leading-tight"
                        style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
                      >
                        {participant.name}
                      </span>
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Start button */}
            <AnimatePresence>
              {stage === "ready" && (
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  onClick={dismiss}
                  className="h-10 px-8 font-[500] text-[13px] transition-opacity hover:opacity-80"
                  style={{
                    background: "var(--gt-blue)",
                    color: "white",
                    borderRadius: "0.375rem",
                    letterSpacing: "var(--gt-tracking-tight)",
                  }}
                >
                  Start →
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Footer hint */}
          <div className="h-10 flex items-center justify-center">
            {stage !== "ready" && (
              <span
                className="text-[11px]"
                style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
              >
                ESC to skip
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
