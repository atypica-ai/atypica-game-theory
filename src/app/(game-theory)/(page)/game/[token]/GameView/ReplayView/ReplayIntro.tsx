"use client";

import { motion, AnimatePresence } from "motion/react";
import React, { useEffect, useState } from "react";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { PLAYER_COLORS } from "../PlayerCard";

interface Participant {
  personaId: number;
  name: string;
  playerId: string;
}

interface ReplayIntroProps {
  gameTypeName: string;
  participants: Participant[];
  onStart: () => void;
}

type Stage = "title" | "arena" | "ready";

export function ReplayIntro({ gameTypeName, participants, onStart }: ReplayIntroProps) {
  const [stage, setStage] = useState<Stage>("title");
  const [isDismissed, setIsDismissed] = useState(false);

  // Title → arena after 900ms
  useEffect(() => {
    if (stage !== "title") return;
    const t = setTimeout(() => setStage("arena"), 900);
    return () => clearTimeout(t);
  }, [stage]);

  // Arena → ready after participants have entered (stagger 300ms each + 600ms settle)
  useEffect(() => {
    if (stage !== "arena") return;
    const delay = participants.length * 300 + 600;
    const t = setTimeout(() => setStage("ready"), delay);
    return () => clearTimeout(t);
  }, [stage, participants.length]);

  // ESC key: skip animations, jump to ready immediately
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
    // Small delay for exit animation, then call onStart
    setTimeout(onStart, 400);
  };

  const isTwoPlayer = participants.length === 2;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col bg-[#09090b] select-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* ── Top: game type label ────────────────────────────── */}
          <div className="flex items-center justify-between px-8 h-[52px] border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
                Game Theory
              </span>
              <span className="w-px h-3 bg-zinc-800" />
              <span className="font-EuclidCircularA text-sm font-medium text-white">
                {gameTypeName}
              </span>
            </div>
            <span className="font-IBMPlexMono text-[9px] tracking-[0.2em] uppercase text-[#1bff1b]/60">
              Replay
            </span>
          </div>

          {/* ── Center: arena ───────────────────────────────────── */}
          <div className="flex-1 flex flex-col items-center justify-center gap-12 px-8">
            {/* ARENA label */}
            <AnimatePresence>
              {stage !== "title" && (
                <motion.span
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="font-IBMPlexMono text-[9px] tracking-[0.28em] uppercase text-zinc-700"
                >
                  Arena
                </motion.span>
              )}
            </AnimatePresence>

            {/* Participants row */}
            <div
              className="flex items-center gap-6"
              style={{ justifyContent: isTwoPlayer ? "center" : "center", flexWrap: "wrap" }}
            >
              {participants.map((participant, idx) => {
                const color = PLAYER_COLORS[idx] ?? "#ffffff";
                return (
                  <React.Fragment key={participant.playerId}>
                    {/* VS divider — only between 2-player participants, rendered before idx===1 */}
                    {isTwoPlayer && idx === 1 && (
                      <AnimatePresence>
                        {stage !== "title" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.7 }}
                            className="self-stretch flex flex-col items-center justify-center gap-1 px-4"
                          >
                            <div className="flex-1 w-px bg-zinc-800" />
                            <span className="font-IBMPlexMono text-[9px] tracking-[0.2em] uppercase text-zinc-700">
                              vs
                            </span>
                            <div className="flex-1 w-px bg-zinc-800" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}

                    {/* Participant card */}
                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      animate={stage !== "title" ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
                      transition={{ duration: 0.55, delay: idx * 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-col items-center gap-4 relative w-44"
                    >
                      {/* Color bar above avatar */}
                      <div className="w-[2px] h-6" style={{ backgroundColor: `${color}60` }} />

                      {/* Avatar */}
                      <div
                        className="relative"
                        style={{
                          filter: `drop-shadow(0 0 24px ${color}30)`,
                        }}
                      >
                        <HippyGhostAvatar seed={participant.personaId} className="size-20" />
                        {/* Outer ring */}
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ border: `1px solid ${color}25` }}
                          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 3, delay: idx * 0.4, repeat: Infinity }}
                        />
                      </div>

                      {/* Name */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-EuclidCircularA text-xl font-medium text-white text-center">
                          {participant.name}
                        </span>
                        <span
                          className="font-IBMPlexMono text-[9px] tracking-[0.18em] uppercase"
                          style={{ color: `${color}70` }}
                        >
                          {participant.playerId}
                        </span>
                      </div>

                      {/* Color dot */}
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Participant count for 3+ players */}
            {!isTwoPlayer && stage !== "title" && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: participants.length * 0.3 + 0.2 }}
                className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-700"
              >
                {participants.length} Players
              </motion.span>
            )}

            {/* START button */}
            <AnimatePresence>
              {stage === "ready" && (
                <motion.button
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  onClick={dismiss}
                  className="mt-4 h-11 px-10 bg-[#1bff1b] text-black font-medium text-sm tracking-[0.06em] hover:bg-[#1bff1b]/90 transition-colors"
                >
                  Start →
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── Bottom: ESC hint ─────────────────────────────────── */}
          <div className="h-12 flex items-center justify-center">
            <AnimatePresence>
              {stage !== "ready" && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-800"
                >
                  ESC to skip
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
