"use client";

import { GameDistributionView } from "@/app/(game-theory)/(page)/HomeView/DistributionChart";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { PLAYER_COLORS } from "./PlayerCard";

const RAINBOW = ["#ff595e", "#ff924c", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#f72585"];

function SingleWinner({
  winner,
  participants,
}: {
  winner: GameSessionParticipant;
  participants: GameSessionParticipant[];
}) {
  const idx = participants.findIndex((x) => x.personaId === winner.personaId);
  const color = PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
  return (
    <div className="flex flex-col items-center gap-3 mb-2">
      <div
        className="rounded-full"
        style={{ outline: `3px solid ${color}`, outlineOffset: 5, boxShadow: `0 0 36px ${color}28` }}
      >
        <HippyGhostAvatar seed={winner.personaId} className="size-20 rounded-full" />
      </div>
      <span
        className="text-[26px] font-[700] mt-1"
        style={{ color, fontFamily: "var(--gt-font-outfit), system-ui, sans-serif", letterSpacing: "var(--gt-tracking-tight)" }}
      >
        {winner.name}
      </span>
    </div>
  );
}

interface ResultsViewProps {
  participants: GameSessionParticipant[];
  cumulativeScores: Record<number, number>;
  winners: GameSessionParticipant[];
  isFullTie: boolean;
  gameType: string;
}

export function ResultsView({
  participants,
  cumulativeScores,
  winners,
  isFullTie,
  gameType,
}: ResultsViewProps) {
  useEffect(() => {
    const end = Date.now() + 4500;
    let frame: number;
    function shoot() {
      confetti({
        particleCount: 5,
        angle: 90,
        spread: 140,
        origin: { x: Math.random(), y: -0.05 },
        colors: RAINBOW,
        shapes: ["square"],
        scalar: 1.6,
        gravity: 0.85,
        ticks: 380,
        drift: (Math.random() - 0.5) * 0.4,
      });
      if (Date.now() < end) {
        frame = requestAnimationFrame(shoot);
      }
    }
    shoot();
    return () => cancelAnimationFrame(frame);
  }, []);

  const sorted = [...participants].sort(
    (a, b) => (cumulativeScores[b.personaId] ?? 0) - (cumulativeScores[a.personaId] ?? 0),
  );
  const maxScore = sorted.length > 0 ? (cumulativeScores[sorted[0].personaId] ?? 0) : 1;

  return (
    <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto py-10 px-8" style={{ maxWidth: "960px" }}>

        {/* ── Winner section ─────────────────────────────────────────────── */}
        <section className="mb-10 flex flex-col items-center text-center">
          {isFullTie ? (
            <>
              <div className="flex items-center gap-6 mb-4">
                {sorted.map((p) => {
                  const idx = participants.findIndex((x) => x.personaId === p.personaId);
                  const color = PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
                  return (
                    <div key={p.personaId} className="flex flex-col items-center gap-2">
                      <HippyGhostAvatar seed={p.personaId} className="size-14 rounded-full" />
                      <span
                        className="text-[14px] font-[600]"
                        style={{
                          color,
                          fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                          letterSpacing: "var(--gt-tracking-tight)",
                        }}
                      >
                        {p.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <span
                className="text-[13px] uppercase tracking-[0.12em]"
                style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
              >
                Perfect tie
              </span>
            </>
          ) : (
            <>
              {/* Multiple co-winners */}
              {winners.length > 1 && (
                <div className="flex items-end gap-8 mb-4">
                  {winners.map((w) => {
                    const idx = participants.findIndex((x) => x.personaId === w.personaId);
                    const color = PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
                    return (
                      <div key={w.personaId} className="flex flex-col items-center gap-3">
                        <div className="rounded-full" style={{ outline: `3px solid ${color}`, outlineOffset: 4 }}>
                          <HippyGhostAvatar seed={w.personaId} className="size-16 rounded-full" />
                        </div>
                        <span
                          className="text-[18px] font-[700]"
                          style={{ color, fontFamily: "var(--gt-font-outfit), system-ui, sans-serif", letterSpacing: "var(--gt-tracking-tight)" }}
                        >
                          {w.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Single winner */}
              {winners.length === 1 && <SingleWinner winner={winners[0]} participants={participants} />}
              <span
                className="text-[11px] uppercase tracking-[0.12em]"
                style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
              >
                {winners.length > 1 ? "co-winners" : "winner"}
              </span>
            </>
          )}
        </section>

        {/* ── Final standings ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <p
            className="text-[11px] uppercase mb-4"
            style={{
              color: "var(--gt-t4)",
              fontFamily: "IBMPlexMono, monospace",
              letterSpacing: "0.12em",
            }}
          >
            Final Standings
          </p>
          <div className="flex flex-col gap-2">
            {sorted.map((p, rank) => {
              const idx = participants.findIndex((x) => x.personaId === p.personaId);
              const color = PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
              const score = cumulativeScores[p.personaId] ?? 0;
              const barPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
              const isWinner = winners.some((w) => w.personaId === p.personaId);
              const dimmed = !isFullTie && winners.length > 0 && !isWinner;

              return (
                <div
                  key={p.personaId}
                  className="flex items-center gap-4 px-4 py-3 transition-all"
                  style={{
                    background: "var(--gt-surface)",
                    border: `1px solid ${isWinner ? color : "var(--gt-border)"}`,
                    borderRadius: "0.5rem",
                    opacity: dimmed ? 0.5 : 1,
                    boxShadow: isWinner ? `0 0 0 1px ${color}40` : undefined,
                  }}
                >
                  <span
                    className="text-[12px] tabular-nums w-4 text-right shrink-0"
                    style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
                  >
                    {rank + 1}
                  </span>
                  <HippyGhostAvatar
                    seed={p.personaId}
                    className="size-8 rounded-full shrink-0"
                  />
                  <span
                    className="text-[14px] font-[500] w-32 truncate shrink-0"
                    style={{
                      color: isWinner ? color : "var(--gt-t1)",
                      fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                      letterSpacing: "var(--gt-tracking-tight)",
                    }}
                  >
                    {p.name}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--gt-border)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: color,
                        transition: "width 0.8s ease-out",
                      }}
                    />
                  </div>
                  <span
                    className="text-[20px] font-[700] tabular-nums shrink-0"
                    style={{
                      color,
                      fontFamily: "IBMPlexMono, monospace",
                      letterSpacing: "var(--gt-tracking-tight)",
                      minWidth: "2.5rem",
                      textAlign: "right",
                    }}
                  >
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Behavior distribution ───────────────────────────────────────── */}
        <section>
          <p
            className="text-[11px] uppercase mb-1"
            style={{
              color: "var(--gt-t4)",
              fontFamily: "IBMPlexMono, monospace",
              letterSpacing: "0.12em",
            }}
          >
            Behavior Distribution
          </p>
          <p
            className="text-[12px] mb-4"
            style={{
              color: "var(--gt-t3)",
              fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
            }}
          >
            How AI personas compare to human experimental baselines
          </p>
          <div
            style={{
              border: "1px solid var(--gt-border)",
              borderRadius: "0.5rem",
              background: "var(--gt-surface)",
              overflow: "hidden",
            }}
          >
            <GameDistributionView gameType={gameType} />
          </div>
        </section>

      </div>
    </div>
  );
}
