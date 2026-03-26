"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface ReplayIntroProps {
  gameTypeName: string; // e.g. "PRISONER'S DILEMMA"
  onComplete: () => void;
}

type Stage = "typewriter" | "badge" | "begin" | "done";

const CHAR_DELAY = 60; // ms per character

export function ReplayIntro({ gameTypeName, onComplete }: ReplayIntroProps) {
  const [stage, setStage] = useState<Stage>("typewriter");
  const [charCount, setCharCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const upperName = gameTypeName.toUpperCase();

  // Typewriter: advance one character at a time
  useEffect(() => {
    if (stage !== "typewriter") return;
    if (charCount >= upperName.length) {
      // Finished typing — move to badge stage after brief hold
      const timer = setTimeout(() => setStage("badge"), 400);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCharCount((c) => c + 1), CHAR_DELAY);
    return () => clearTimeout(timer);
  }, [stage, charCount, upperName.length]);

  // Badge stage — hold 800ms then show BEGIN
  useEffect(() => {
    if (stage !== "badge") return;
    const timer = setTimeout(() => setStage("begin"), 800);
    return () => clearTimeout(timer);
  }, [stage]);

  // Begin stage — hold 300ms then fire onComplete
  useEffect(() => {
    if (stage !== "begin") return;
    const timer = setTimeout(() => {
      setStage("done");
      setIsDismissed(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [stage]);

  // Notify parent after exit animation
  useEffect(() => {
    if (isDismissed) {
      const timer = setTimeout(onComplete, 400); // wait for fade-out
      return () => clearTimeout(timer);
    }
  }, [isDismissed, onComplete]);

  // Allow click or ESC to skip
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDismissed) {
        setIsDismissed(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isDismissed]);

  const handleClick = () => {
    if (!isDismissed) setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b] cursor-pointer select-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={handleClick}
          aria-hidden
        >
          {/* Game type name — typewriter reveal */}
          <div className="flex items-center justify-center mb-8 h-8">
            <span className="font-IBMPlexMono text-sm tracking-[0.22em] uppercase text-zinc-300">
              {upperName.slice(0, charCount)}
              {/* Blinking cursor */}
              {charCount < upperName.length && (
                <motion.span
                  className="inline-block w-[2px] h-[1em] bg-zinc-500 align-middle ml-0.5"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                />
              )}
            </span>
          </div>

          {/* REPLAY badge — fades in after typewriter */}
          <AnimatePresence>
            {(stage === "badge" || stage === "begin" || stage === "done") && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 border border-[rgba(27,255,27,0.3)] bg-zinc-900/80 backdrop-blur-sm px-4 py-2"
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-[#1bff1b]"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <span className="font-IBMPlexMono text-xs tracking-[0.2em] uppercase text-[#1bff1b]">
                  Replay
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ESC hint — appears with badge */}
          <AnimatePresence>
            {(stage === "badge" || stage === "begin") && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="absolute bottom-8 font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-700"
              >
                Click anywhere to skip
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
