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
import { GameFeed } from "./ActivityFeed";
import { PlayerResultState, PLAYER_COLORS, ScoreboardRow } from "./PlayerCard";
import { PlayerDetailPanel } from "./PlayerDetailPanel";
import { ReplayView } from "./ReplayView";
import { RoundPill } from "./RoundView";

// ── Event helpers ─────────────────────────────────────────────────────────────

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
      refreshInterval: (d) => (d?.status === "completed" ? 0 : 2000),
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

  // ── Round state ───────────────────────────────────────────────────────────

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
          scores[Number(id)] = (scores[Number(id)] ?? 0) + v;
        }
      }
    }
    return scores;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events)]);

  // ── UI state ──────────────────────────────────────────────────────────────

  const [displayRoundId, setDisplayRoundId] = useState<number | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const isLiveView = displayRoundId === null;

  // ── Completion / co-winner support ────────────────────────────────────────

  const isCompleted = status === "completed";
  const isPending = status === "pending" || participants.length === 0;

  const winners = useMemo(() => {
    if (!isCompleted || participants.length === 0) return [] as GameSessionParticipant[];
    const maxScore = Math.max(...participants.map((p) => cumulativeScores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (cumulativeScores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return [] as GameSessionParticipant[]; // full tie
    return leaders;
  }, [isCompleted, participants, cumulativeScores]);

  const isFullTie = isCompleted && participants.length > 0 && winners.length === 0;

  function getResultState(personaId: number): PlayerResultState | undefined {
    if (!isCompleted) return undefined;
    if (isFullTie) return "tie";
    return winners.some((w) => w.personaId === personaId) ? "winner" : "loser";
  }

  // ── Result banner ─────────────────────────────────────────────────────────

  const bannerText = useMemo(() => {
    if (!isCompleted) return null;
    if (isFullTie) return { text: "Tie · Equal Scores", color: "#d97706" };
    if (winners.length === 1) {
      const idx = participants.indexOf(winners[0]);
      return { text: `${winners[0].name} · Wins`, color: PLAYER_COLORS[idx] ?? "#1bff1b" };
    }
    return { text: `${winners.map((w) => w.name).join(" & ")} · Win`, color: "#1bff1b" };
  }, [isCompleted, isFullTie, winners, participants]);

  // ── History bar ───────────────────────────────────────────────────────────

  const historyBarRounds = [
    ...completedRoundIds.map((r) => ({ roundId: r, isLiveRound: false })),
    ...(activeRoundId !== null ? [{ roundId: activeRoundId, isLiveRound: true }] : []),
  ];

  const currentRoundNumber =
    activeRoundId ?? (completedRoundIds.length > 0 ? completedRoundIds[completedRoundIds.length - 1] : 0);

  // ── Scoreboard (sorted by score desc, stable) ─────────────────────────────

  const rankedParticipants = useMemo(() => {
    return [...participants]
      .map((p, i) => ({ p, i }))
      .sort((a, b) => {
        const diff = (cumulativeScores[b.p.personaId] ?? 0) - (cumulativeScores[a.p.personaId] ?? 0);
        return diff !== 0 ? diff : a.i - b.i;
      });
  }, [participants, cumulativeScores]);

  return (
    <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 h-[52px] flex items-center justify-between px-8 border-b border-white/[0.05] z-10">
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
              style={{ backgroundColor: isCompleted ? "#3f3f46" : isPending ? "#3f3f46" : "#1bff1b" }}
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
        {bannerText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="shrink-0 h-8 flex items-center justify-center gap-4 border-b border-white/[0.04]"
            style={{ background: `${bannerText.color}08` }}
          >
            <div className="flex-1 h-px max-w-24" style={{ backgroundColor: `${bannerText.color}20` }} />
            <span
              className="font-IBMPlexMono text-[10px] tracking-[0.22em] uppercase"
              style={{ color: bannerText.color }}
            >
              {bannerText.text}
            </span>
            <div className="flex-1 h-px max-w-24" style={{ backgroundColor: `${bannerText.color}20` }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Game feed — the main stage */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
          {isPending ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
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
            <GameFeed
              events={events}
              participants={participants}
              displayRoundId={displayRoundId}
              activeRoundId={activeRoundId}
            />
          )}

          {/* Detail panel overlays the feed */}
          <PlayerDetailPanel
            personaId={selectedPersonaId}
            participants={participants}
            events={events}
            completedRoundIds={completedRoundIds}
            activeRoundId={activeRoundId}
            cumulativeScores={cumulativeScores}
            winners={winners}
            isFullTie={isFullTie}
            onClose={() => setSelectedPersonaId(null)}
          />
        </div>

        {/* Right: Compact scoreboard */}
        <div className="w-[220px] shrink-0 border-l border-white/[0.05] flex flex-col">
          <div className="shrink-0 h-9 flex items-center px-4 border-b border-white/[0.04]">
            <span className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase text-zinc-700">
              Scores
            </span>
          </div>
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden divide-y divide-white/[0.03]">
            {isPending ? (
              <div className="flex items-center justify-center h-16">
                <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-800">
                  —
                </span>
              </div>
            ) : (
              rankedParticipants.map(({ p, i }, rank) => (
                <ScoreboardRow
                  key={p.personaId}
                  participant={p}
                  playerIndex={i}
                  score={cumulativeScores[p.personaId] ?? 0}
                  rank={rank + 1}
                  resultState={getResultState(p.personaId)}
                  onClick={() =>
                    setSelectedPersonaId((prev) => (prev === p.personaId ? null : p.personaId))
                  }
                />
              ))
            )}
          </div>
        </div>
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
