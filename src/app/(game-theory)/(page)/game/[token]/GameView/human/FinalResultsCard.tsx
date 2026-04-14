"use client";

import {
  GameSessionParticipant,
  HUMAN_PLAYER_ID,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import confetti from "canvas-confetti";
import { Trophy, Cpu, User } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CONFETTI_COLORS = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#f72585"];

function avatarSeed(p: GameSessionParticipant): number {
  return p.personaId === HUMAN_PLAYER_ID ? (p.userId ?? 0) : p.personaId;
}

interface FinalResultsCardProps {
  participants: GameSessionParticipant[];
  cumulativeScores: Record<number, number>;
  winners: GameSessionParticipant[];
  isFullTie: boolean;
  onFinish?: () => void;
}

export function FinalResultsCard({
  participants,
  cumulativeScores,
  winners,
  isFullTie,
  onFinish,
}: FinalResultsCardProps) {
  const router = useRouter();
  // Confetti on mount
  useEffect(() => {
    const end = Date.now() + 4500;
    let frame: number;
    function shoot() {
      confetti({
        particleCount: 5,
        angle: 90,
        spread: 140,
        origin: { x: Math.random(), y: -0.05 },
        colors: CONFETTI_COLORS,
        shapes: ["square"],
        scalar: 1.6,
        gravity: 0.85,
        ticks: 380,
        drift: (Math.random() - 0.5) * 0.4,
      });
      if (Date.now() < end) frame = requestAnimationFrame(shoot);
    }
    shoot();
    return () => cancelAnimationFrame(frame);
  }, []);

  const sorted = [...participants].sort(
    (a, b) => (cumulativeScores[b.personaId] ?? 0) - (cumulativeScores[a.personaId] ?? 0),
  );

  return (
    <motion.div
      key="final-results"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-lab p-4 sm:p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 sm:mb-8">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center"
          style={{ background: "var(--gt-row-alt)", color: "var(--gt-ink)" }}
        >
          <Trophy size={20} />
        </div>
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--gt-t1)", letterSpacing: "-0.03em" }}
          >
            Experiment Complete
          </h2>
          <p className="text-xs" style={{ color: "var(--gt-t3)" }}>
            {isFullTie
              ? "Perfect tie — all participants scored equally"
              : winners.length > 1
                ? `${winners.map((w) => w.name).join(" & ")} win`
                : winners.length === 1
                  ? `${winners[0].name} wins`
                  : "Final standings"}
          </p>
        </div>
      </div>

      {/* Winner showcase */}
      {!isFullTie && winners.length > 0 && (
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-5 sm:mb-8">
          {winners.map((w) => {
            const score = cumulativeScores[w.personaId] ?? 0;
            return (
              <div key={w.personaId} className="flex flex-col items-center gap-2">
                <div
                  className="rounded-full"
                  style={{
                    outline: "3px solid var(--gt-pos)",
                    outlineOffset: 4,
                    boxShadow: "0 0 36px hsl(125 49% 43% / 0.15)",
                  }}
                >
                  <HippyGhostAvatar seed={avatarSeed(w)} className="size-16 rounded-full" />
                </div>
                <span
                  className="text-[15px] font-semibold"
                  style={{
                    color: "var(--gt-pos)",
                    fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                    letterSpacing: "-0.025em",
                  }}
                >
                  {w.name}
                </span>
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--gt-pos)", fontFamily: "IBMPlexMono, monospace" }}
                >
                  {score}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Final standings */}
      <div className="space-y-3">
        <h3
          className="text-xs font-bold uppercase mb-4"
          style={{ letterSpacing: "0.1em", color: "var(--gt-t4)" }}
        >
          Final Standings
        </h3>

        {sorted.map((p, rank) => {
          const isWinner = winners.some((w) => w.personaId === p.personaId);
          const isHuman = p.personaId === HUMAN_PLAYER_ID;
          const score = cumulativeScores[p.personaId] ?? 0;
          const dimmed = !isFullTie && winners.length > 0 && !isWinner;
          const seed = avatarSeed(p);

          return (
            <div
              key={p.personaId}
              className="flex items-center justify-between p-3 rounded-md border transition-all"
              style={{
                background: isWinner ? "var(--gt-pos-bg)" : "var(--gt-surface)",
                borderColor: isWinner ? "hsl(125 49% 43% / 0.3)" : "var(--gt-border)",
                opacity: dimmed ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[12px] tabular-nums w-4 text-right shrink-0"
                  style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
                >
                  {rank + 1}
                </span>
                {isHuman ? (
                  <User size={14} style={{ color: "var(--gt-t3)" }} />
                ) : (
                  <Cpu size={14} style={{ color: "var(--gt-t3)" }} />
                )}
                <HippyGhostAvatar seed={seed} className="size-6 rounded-full" />
                <span
                  className={`text-sm ${isWinner ? "font-bold" : ""}`}
                  style={{
                    color: isWinner ? "var(--gt-t1)" : "var(--gt-t2)",
                    fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                  }}
                >
                  {p.name}
                </span>
                {isWinner && (
                  <span
                    className="badge-lab"
                    style={{ background: "var(--gt-pos)", color: "white", borderColor: "transparent" }}
                  >
                    WINNER
                  </span>
                )}
              </div>
              <span
                className="text-[18px] font-bold tabular-nums"
                style={{
                  color: isWinner ? "var(--gt-pos)" : "var(--gt-t1)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Finish button */}
      <button
        onClick={onFinish ?? (() => router.push("/play/new"))}
        className="btn-lab w-full mt-5 sm:mt-8 flex items-center justify-center gap-2 text-xl py-4"
      >
        FINISH
      </button>
    </motion.div>
  );
}
