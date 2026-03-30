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
import { ActivityFeed } from "./ActivityFeed";
import { PlayerCard2, PLAYER_COLORS, PlayerResultState } from "./PlayerCard";
import { PlayerDetailPanel } from "./PlayerDetailPanel";
import { ReplayView } from "./ReplayView";
import { RoundPill } from "./RoundView";

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

  // null = live view; number = pinned to a specific round in feed
  const [displayRoundId, setDisplayRoundId] = useState<number | null>(null);
  // null = panel closed
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  const isLiveView = displayRoundId === null;

  // isCurrentRound = true when live-viewing the active in-progress round
  const isCurrentRound = isLiveView && activeRoundId !== null;

  // ── Completion / winners (supports co-winners) ────────────────────────────

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
      const winnerIdx = participants.indexOf(winners[0]);
      return {
        text: `${winners[0].name} · Wins`,
        color: PLAYER_COLORS[winnerIdx] ?? "#1bff1b",
      };
    }
    // Multiple co-winners
    const names = winners.map((w) => w.name).join(" & ");
    return { text: `${names} · Win`, color: "#1bff1b" };
  }, [isCompleted, isFullTie, winners, participants]);

  // ── History bar rounds ────────────────────────────────────────────────────

  const historyBarRounds: { roundId: number; isLiveRound: boolean }[] = [
    ...completedRoundIds.map((r) => ({ roundId: r, isLiveRound: false })),
    ...(activeRoundId !== null ? [{ roundId: activeRoundId, isLiveRound: true }] : []),
  ];

  const currentRoundNumber =
    activeRoundId ?? (completedRoundIds.length > 0 ? completedRoundIds[completedRoundIds.length - 1] : 0);

  // ── Player cards: show current active round state ─────────────────────────

  const shownRoundId = activeRoundId ?? (completedRoundIds.length > 0 ? completedRoundIds[completedRoundIds.length - 1] : null);

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

      {/* ── Main body: player grid (left) + activity feed (right) ──────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: 2-column player grid */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
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
              className="absolute inset-0 grid grid-cols-2 gap-px overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
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
                  <PlayerCard2
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

          {/* Detail panel — slides over the player grid */}
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

        {/* Right: Activity feed */}
        <ActivityFeed
          events={events}
          participants={participants}
          displayRoundId={displayRoundId}
          activeRoundId={activeRoundId}
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

          {/* Return to live shortcut */}
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
