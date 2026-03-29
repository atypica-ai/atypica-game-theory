"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { PlayerCard, PlayerCardIdle, PlayerResultState, PLAYER_COLORS } from "./PlayerCard";
import { ReplayView } from "./ReplayView";
import { RoundView } from "./RoundView";

function formatGameTypeName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// ── Event-derived helpers ────────────────────────────────────────────────────

function getDecision(
  events: GameTimeline,
  personaId: number,
  round: number,
): PersonaDecisionEvent | null {
  return (
    (events.find(
      (e) => e.type === "persona-decision" && e.personaId === personaId && e.round === round,
    ) as PersonaDecisionEvent | undefined) ?? null
  );
}

function getRoundDecisions(
  events: GameTimeline,
  round: number,
): Map<number, PersonaDecisionEvent> {
  const map = new Map<number, PersonaDecisionEvent>();
  for (const e of events) {
    if (e.type === "persona-decision" && e.round === round) {
      map.set(e.personaId, e as PersonaDecisionEvent);
    }
  }
  return map;
}

function getRoundPayoffs(events: GameTimeline, round: number): Record<number, number> {
  const e = events.find(
    (ev): ev is RoundResultEvent => ev.type === "round-result" && ev.round === round,
  );
  return e?.payoffs ?? {};
}

// ── GameView entry point ─────────────────────────────────────────────────────

export function GameView({
  initialData,
  token,
  replay = false,
}: {
  initialData: GameSessionDetail;
  token: string;
  replay?: boolean;
}) {
  if (replay) {
    return <ReplayView initialData={initialData} />;
  }
  return <GameLiveView initialData={initialData} token={token} />;
}

// ── Live view ────────────────────────────────────────────────────────────────

function GameLiveView({
  initialData,
  token,
}: {
  initialData: GameSessionDetail;
  token: string;
}) {
  const { data } = useSWR(
    ["game:session", token],
    async () => {
      const result = await fetchGameSession(token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: initialData,
      refreshInterval: (data) => (data?.status === "completed" ? 0 : 2000),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const session = data ?? initialData;
  const { status, gameType } = session;
  const events = session.events;
  const participants: GameSessionParticipant[] = useMemo(
    () => session.extra?.participants ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(session.extra?.participants)],
  );

  // ── Derive round state from flat events ───────────────────────────────────

  const completedRoundIds = useMemo(() => {
    const ids = events
      .filter((e): e is RoundResultEvent => e.type === "round-result")
      .map((e) => e.round)
      .sort((a, b) => a - b);
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events)]);

  const activeRoundId = useMemo(() => {
    // A round is "active" if it has any player activity (discussion OR decision) but no round-result.
    // Including discussion events ensures games with a discussion phase show the round as active
    // even before any decisions have been made.
    const roundsWithActivity = new Set(
      events
        .filter(
          (e): e is PersonaDecisionEvent | PersonaDiscussionEvent =>
            e.type === "persona-decision" || e.type === "persona-discussion",
        )
        .map((e) => e.round),
    );
    const completedSet = new Set(completedRoundIds);
    const active = [...roundsWithActivity].filter((r) => !completedSet.has(r));
    return active.length > 0 ? Math.max(...active) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events), completedRoundIds]);

  // ── Round browsing ────────────────────────────────────────────────────────
  // null = live/latest view; number = index into completedRoundIds
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (browseIndex !== null && browseIndex >= completedRoundIds.length) {
      setBrowseIndex(completedRoundIds.length > 0 ? completedRoundIds.length - 1 : null);
    }
  }, [browseIndex, completedRoundIds.length]);

  const prevRound = useCallback(() => {
    if (browseIndex === null) {
      if (completedRoundIds.length > 0) setBrowseIndex(completedRoundIds.length - 1);
    } else if (browseIndex > 0) {
      setBrowseIndex((b) => (b ?? 1) - 1);
    }
  }, [browseIndex, completedRoundIds.length]);

  const nextRound = useCallback(() => {
    if (browseIndex === null) return;
    if (browseIndex < completedRoundIds.length - 1) {
      setBrowseIndex((b) => (b ?? 0) + 1);
    } else {
      setBrowseIndex(null);
    }
  }, [browseIndex, completedRoundIds.length]);

  const skipToLatest = useCallback(() => setBrowseIndex(null), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevRound();
      else if (e.key === "ArrowRight") nextRound();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prevRound, nextRound]);

  // The round ID currently displayed in the arena
  const displayRoundId =
    browseIndex !== null
      ? (completedRoundIds[browseIndex] ?? null)
      : (activeRoundId ?? (completedRoundIds[completedRoundIds.length - 1] ?? null));

  const isLiveView = browseIndex === null;
  const isCurrentRoundActive = isLiveView && activeRoundId !== null;

  // ── Scores ────────────────────────────────────────────────────────────────

  const cumulativeScores = useMemo(() => {
    const scores: Record<number, number> = {};
    for (const e of events) {
      if (e.type === "round-result") {
        for (const [id, v] of Object.entries(e.payoffs)) {
          const numId = Number(id);
          scores[numId] = (scores[numId] ?? 0) + v;
        }
      }
    }
    return scores;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events)]);

  const isCompleted = status === "completed";
  const isPending = status === "pending" || participants.length === 0;

  // ── Winner ────────────────────────────────────────────────────────────────

  const { winner, winnerIndex } = useMemo(() => {
    if (!isCompleted || participants.length === 0) return { winner: null, winnerIndex: -1 };
    const maxScore = Math.max(...participants.map((p) => cumulativeScores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (cumulativeScores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return { winner: "TIE" as const, winnerIndex: -1 };
    const idx = participants.indexOf(leaders[0]);
    return { winner: leaders[0].name, winnerIndex: idx };
  }, [isCompleted, participants, cumulativeScores]);

  const winnerColor =
    winner && winner !== "TIE" ? (PLAYER_COLORS[winnerIndex] ?? "#1bff1b") : "#d97706";

  function getResultState(personaId: number): PlayerResultState | undefined {
    if (!isCompleted) return undefined;
    if (winner === "TIE") return "tie";
    const p = participants.find((x) => x.personaId === personaId);
    if (!p) return undefined;
    return p.name === winner ? "winner" : "loser";
  }

  const currentRoundNumber = activeRoundId ?? completedRoundIds.length;
  const canGoPrev = browseIndex === null ? completedRoundIds.length > 0 : browseIndex > 0;
  const canGoNext = browseIndex !== null;

  const roundLabel = (() => {
    if (isLiveView && activeRoundId !== null) return "Live";
    return displayRoundId !== null ? `R${displayRoundId} · ${completedRoundIds.length}` : "";
  })();

  return (
    <div className="h-screen flex flex-col bg-[#09090b] relative">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="shrink-0 h-[52px] flex items-center justify-between px-8 border-b border-white/[0.05] relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
            Game Theory
          </span>
          <span className="w-px h-3 bg-zinc-800" />
          <span className="font-EuclidCircularA text-sm font-medium text-white">
            {formatGameTypeName(gameType)}
          </span>
        </div>

        <div className="flex items-center gap-5">
          {!isPending && currentRoundNumber > 0 && (
            <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-600">
              Round {currentRoundNumber}
            </span>
          )}
          {completedRoundIds.length > 0 && (
            <button
              onClick={() => setShowHistory((h) => !h)}
              className={`font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase transition-colors ${
                showHistory ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              History
            </button>
          )}
          {isCompleted && (
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/game/${token}/replay`,
                  );
                }
              }}
              className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600 hover:text-[#1bff1b]/60 transition-colors"
            >
              Share Replay
            </button>
          )}
          <div className="flex items-center gap-2">
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isCompleted ? "#3f3f46" : isPending ? "#3f3f46" : "#1bff1b",
              }}
              animate={
                !isCompleted && !isPending
                  ? { boxShadow: ["0 0 0px #1bff1b", "0 0 8px #1bff1b", "0 0 0px #1bff1b"] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-600">
              {isCompleted ? "Complete" : isPending ? "Pending" : "Live"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Floating history panel ──────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <>
            <div
              className="absolute inset-0 z-20 top-[52px]"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              className="absolute top-[52px] right-0 z-30 w-72 max-h-[60vh] flex flex-col border-l border-b border-white/[0.06] bg-[#0a0a0d]/96 backdrop-blur-md overflow-hidden"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center justify-between px-5 h-9 border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
                    History
                  </span>
                  <span className="font-IBMPlexMono text-[8px] text-zinc-800">
                    {completedRoundIds.length} round{completedRoundIds.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {participants.map((p, idx) => {
                    const color = PLAYER_COLORS[idx] ?? "#ffffff";
                    return (
                      <span
                        key={p.personaId}
                        className="font-IBMPlexMono text-[9px] tabular-nums"
                        style={{ color: `${color}80` }}
                      >
                        {p.name.split(" ")[0]}&nbsp;{cumulativeScores[p.personaId] ?? 0}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-y-auto flex flex-col gap-px">
                {[...completedRoundIds].reverse().map((roundId) => (
                  <RoundView
                    key={roundId}
                    roundId={roundId}
                    participants={participants}
                    decisions={getRoundDecisions(events, roundId)}
                    payoffs={getRoundPayoffs(events, roundId)}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Result banner ───────────────────────────────────────── */}
      <AnimatePresence>
        {isCompleted && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="shrink-0 h-8 flex items-center justify-center gap-4 border-b border-white/[0.04]"
            style={{ background: `${winnerColor}08` }}
          >
            <div className="flex-1 h-px max-w-24" style={{ backgroundColor: `${winnerColor}20` }} />
            <span
              className="font-IBMPlexMono text-[10px] tracking-[0.22em] uppercase"
              style={{ color: winnerColor }}
            >
              {winner === "TIE" ? "Tie · Equal Scores" : `${winner} · Wins`}
            </span>
            <div className="flex-1 h-px max-w-24" style={{ backgroundColor: `${winnerColor}20` }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Player arena ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        <div
          className="absolute inset-0 grid gap-px overflow-hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.035)",
            gridTemplateColumns: `repeat(${Math.max(participants.length, 1)}, 1fr)`,
          }}
        >
          {isPending ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-2.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-zinc-700"
                    animate={{ opacity: [0.15, 1, 0.15] }}
                    transition={{ duration: 1.4, delay: i * 0.25, repeat: Infinity }}
                  />
                ))}
              </div>
              <span className="font-IBMPlexMono text-[9px] tracking-[0.22em] uppercase text-zinc-700">
                Awaiting players
              </span>
            </div>
          ) : (
            participants.map((participant, idx) => {
              const resultState = getResultState(participant.personaId);
              const cumScore = cumulativeScores[participant.personaId] ?? 0;

              if (displayRoundId === null) {
                return (
                  <PlayerCardIdle
                    key={participant.personaId}
                    personaId={participant.personaId}
                    personaName={participant.name}
                    playerIndex={idx}
                    cumulativeScore={cumScore}
                    resultState={resultState}
                  />
                );
              }

              const decision = getDecision(events, participant.personaId, displayRoundId);
              const payoffs = getRoundPayoffs(events, displayRoundId);

              return (
                <PlayerCard
                  key={participant.personaId}
                  personaId={participant.personaId}
                  personaName={participant.name}
                  playerIndex={idx}
                  decision={decision}
                  payoff={payoffs[participant.personaId]}
                  cumulativeScore={cumScore}
                  isCurrentRound={isCurrentRoundActive}
                  resultState={resultState}
                />
              );
            })
          )}
        </div>

        <AnimatePresence>
          {canGoPrev && (
            <motion.button
              key="prev"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={prevRound}
              className="absolute left-0 top-0 h-full w-16 z-10 flex items-center justify-start pl-4 group"
              style={{ background: "linear-gradient(to right, rgba(0,0,0,0.45) 0%, transparent 100%)" }}
            >
              <span className="font-IBMPlexMono text-xl text-zinc-500 group-hover:text-white transition-colors duration-150">
                ←
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {canGoNext && (
            <motion.button
              key="next"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={nextRound}
              className="absolute right-0 top-0 h-full w-16 z-10 flex items-center justify-end pr-4 group"
              style={{ background: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, transparent 100%)" }}
            >
              <span className="font-IBMPlexMono text-xl text-zinc-500 group-hover:text-white transition-colors duration-150">
                →
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Round indicator bar ──────────────────────────────────── */}
      {completedRoundIds.length > 0 && (
        <div className="shrink-0 h-10 flex items-center justify-center border-t border-white/[0.05] relative">
          <div className="flex items-center gap-2">
            {isLiveView && activeRoundId !== null && (
              <motion.span
                className="w-1 h-1 rounded-full bg-[#1bff1b]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
            <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600 tabular-nums">
              {roundLabel}
            </span>
          </div>

          <AnimatePresence>
            {!isLiveView && (
              <motion.button
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                onClick={skipToLatest}
                className="absolute right-6 font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {activeRoundId !== null ? "Live ↑" : "Latest ↑"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
