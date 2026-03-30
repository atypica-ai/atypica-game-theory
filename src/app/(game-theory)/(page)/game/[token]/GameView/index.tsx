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
import { useMemo, useState } from "react";
import useSWR from "swr";
import { PlayerNode, PLAYER_COLORS, PlayerResultState } from "./PlayerCard";
import { PlayerDetailPanel } from "./PlayerDetailPanel";
import { ReplayView } from "./ReplayView";
import { RoundPill } from "./RoundView";

// ── Grid column strategy ──────────────────────────────────────────────────────
// Target ~2 rows for larger counts; single row for small counts.
// Index = player count - 1.
const COLS_BY_COUNT = [1, 2, 3, 2, 3, 3, 4, 4, 5, 5];

function getGridCols(n: number): number {
  return COLS_BY_COUNT[Math.min(n, 10) - 1] ?? 5;
}

// ── Event-derived helpers ─────────────────────────────────────────────────────

function getDecision(
  events: GameTimeline,
  personaId: number,
  round: number,
): PersonaDecisionEvent | null {
  return (
    events.find(
      (e): e is PersonaDecisionEvent =>
        e.type === "persona-decision" && e.personaId === personaId && e.round === round,
    ) ?? null
  );
}

function getLastDiscussion(
  events: GameTimeline,
  personaId: number,
  round: number,
): PersonaDiscussionEvent | null {
  const msgs = events.filter(
    (e): e is PersonaDiscussionEvent =>
      e.type === "persona-discussion" && e.personaId === personaId && e.round === round,
  );
  return msgs[msgs.length - 1] ?? null;
}

function getRoundPayoffs(events: GameTimeline, round: number): Record<number, number> {
  const e = events.find(
    (ev): ev is RoundResultEvent => ev.type === "round-result" && ev.round === round,
  );
  return e?.payoffs ?? {};
}

function getRoundPayoffSum(events: GameTimeline, round: number): number {
  return Object.values(getRoundPayoffs(events, round)).reduce((acc, v) => acc + v, 0);
}

function formatGameTypeName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// ── GameView entry point ──────────────────────────────────────────────────────

export function GameView({
  initialData,
  token,
  replay = false,
}: {
  initialData: GameSessionDetail;
  token: string;
  replay?: boolean;
}) {
  if (replay) return <ReplayView initialData={initialData} />;
  return <GameLiveView initialData={initialData} token={token} />;
}

// ── Live view ─────────────────────────────────────────────────────────────────

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
    return events
      .filter((e): e is RoundResultEvent => e.type === "round-result")
      .map((e) => e.round)
      .sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events)]);

  const activeRoundId = useMemo(() => {
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

  // ── UI state ──────────────────────────────────────────────────────────────

  // null = live view; number = pinned to a specific completed round
  const [displayRoundId, setDisplayRoundId] = useState<number | null>(null);
  // null = panel closed
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  const isLiveView = displayRoundId === null;

  // The round whose data is shown in the player grid
  const shownRoundId =
    displayRoundId ??
    activeRoundId ??
    (completedRoundIds.length > 0 ? completedRoundIds[completedRoundIds.length - 1] : null);

  // isCurrentRound = true only when live-viewing the active in-progress round
  const isCurrentRound = isLiveView && activeRoundId !== null;

  // ── Completion / winner ───────────────────────────────────────────────────

  const isCompleted = status === "completed";
  const isPending = status === "pending" || participants.length === 0;

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

  // ── Grid layout ───────────────────────────────────────────────────────────

  const cols = getGridCols(Math.max(participants.length, 1));

  // ── History bar ───────────────────────────────────────────────────────────

  const historyBarRounds: { roundId: number; isLiveRound: boolean }[] = [
    ...completedRoundIds.map((r) => ({ roundId: r, isLiveRound: false })),
    ...(activeRoundId !== null ? [{ roundId: activeRoundId, isLiveRound: true }] : []),
  ];

  const currentRoundNumber =
    activeRoundId ?? (completedRoundIds.length > 0 ? completedRoundIds[completedRoundIds.length - 1] : 0);

  return (
    <div className="h-screen flex flex-col bg-[#09090b] relative overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
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

      {/* ── Result banner ───────────────────────────────────────────────────── */}
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

      {/* ── Player grid ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        {isPending ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
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
          <div
            className="absolute inset-0 grid gap-px overflow-hidden"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridAutoRows: "1fr",
            }}
          >
            {participants.map((participant, idx) => {
              const decision = shownRoundId
                ? getDecision(events, participant.personaId, shownRoundId)
                : null;
              const lastDiscussion = shownRoundId
                ? getLastDiscussion(events, participant.personaId, shownRoundId)
                : null;
              const payoffs = shownRoundId ? getRoundPayoffs(events, shownRoundId) : {};

              return (
                <PlayerNode
                  key={participant.personaId}
                  personaId={participant.personaId}
                  personaName={participant.name}
                  playerIndex={idx}
                  decision={decision}
                  lastDiscussion={lastDiscussion}
                  payoff={payoffs[participant.personaId]}
                  cumulativeScore={cumulativeScores[participant.personaId] ?? 0}
                  isCurrentRound={isCurrentRound}
                  resultState={getResultState(participant.personaId)}
                  onClick={() =>
                    setSelectedPersonaId((prev) =>
                      prev === participant.personaId ? null : participant.personaId,
                    )
                  }
                />
              );
            })}
          </div>
        )}

        {/* Detail panel — overlays the grid */}
        <PlayerDetailPanel
          personaId={selectedPersonaId}
          participants={participants}
          events={events}
          completedRoundIds={completedRoundIds}
          activeRoundId={activeRoundId}
          cumulativeScores={cumulativeScores}
          onClose={() => setSelectedPersonaId(null)}
        />
      </div>

      {/* ── Round history bar ────────────────────────────────────────────────── */}
      {historyBarRounds.length > 0 && (
        <div className="shrink-0 h-10 border-t border-white/[0.05] flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {historyBarRounds.map(({ roundId, isLiveRound }) => (
            <RoundPill
              key={roundId}
              roundId={roundId}
              payoffSum={isLiveRound ? null : getRoundPayoffSum(events, roundId)}
              isViewing={isLiveRound ? isLiveView : displayRoundId === roundId}
              isLive={isLiveRound}
              onClick={() => {
                if (isLiveRound) {
                  setDisplayRoundId(null);
                } else {
                  setDisplayRoundId((prev) => (prev === roundId ? null : roundId));
                }
              }}
            />
          ))}

          <div className="flex-1" />

          {/* Return to live shortcut (shown when browsing history while game is running) */}
          <AnimatePresence>
            {!isLiveView && activeRoundId !== null && (
              <motion.button
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                onClick={() => setDisplayRoundId(null)}
                className="shrink-0 flex items-center gap-1.5 px-4 h-full border-l border-white/[0.04] font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600 hover:text-[#1bff1b]/70 transition-colors"
              >
                <motion.span
                  className="w-1 h-1 rounded-full bg-[#1bff1b]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                Live
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
