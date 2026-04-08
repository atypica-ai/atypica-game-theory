"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import {
  GameSessionParticipant,
  GameTimelineEvent,
  HUMAN_PLAYER_ID,
} from "@/app/(game-theory)/types";
import { AnimatePresence } from "motion/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { groupEventsByRound, RoundData, RoundDetailView } from "./ActivityFeed";
import { HumanInputPanel, PendingHumanTurn } from "./HumanInputPanel";
import { PlayerResultState, PLAYER_COLORS } from "./PlayerCard";
import { ReplayView } from "./ReplayView";
import { ResultsView } from "./ResultsView";
import { RoundPill } from "./RoundView";

// ── Types ────────────────────────────────────────────────────────────────────

export type GamePhase = "starting" | "discussion" | "decision" | "reveal" | "completed";

interface GameState {
  latestRound: number;
  completedRounds: number[];
  activeRound: number | null;
  phase: GamePhase;
  rounds: RoundData[];
  scores: Record<number, number>;
  decidedPlayers: Set<number>;
  discussedPlayers: Set<number>;
  discussionCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRoundPayoffSum(round: RoundData): number {
  if (!round.result) return 0;
  return Object.values(round.result.payoffs).reduce((acc, v) => acc + v, 0);
}

function getScoresUpToRound(allRoundData: RoundData[], upToRoundId: number): Record<number, number> {
  const scores: Record<number, number> = {};
  for (const round of allRoundData) {
    if (round.roundId > upToRoundId) break;
    if (round.result) {
      for (const [id, v] of Object.entries(round.result.payoffs)) {
        scores[Number(id)] = (scores[Number(id)] ?? 0) + v;
      }
    }
  }
  return scores;
}

function formatGameTypeName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function hasRound(e: GameTimelineEvent): e is GameTimelineEvent & { round: number } {
  return "round" in e && typeof e.round === "number";
}

function deriveGameState(events: GameTimelineEvent[], isCompleted: boolean): GameState {
  // 1. Find highest round in ANY event
  let latestRound = 0;
  for (const e of events) {
    if (hasRound(e) && e.round > latestRound) latestRound = e.round;
  }

  // 2. Completed rounds
  const completedRoundSet = new Set<number>();
  for (const e of events) {
    if (e.type === "round-result") completedRoundSet.add(e.round);
  }
  const completedRounds = [...completedRoundSet].sort((a, b) => a - b);

  // 3. Active round
  const activeRound = latestRound > 0 && !completedRoundSet.has(latestRound) ? latestRound : null;

  // 4. Phase detection for active round
  let phase: GamePhase = isCompleted ? "completed" : "starting";
  if (!isCompleted && activeRound !== null) {
    let hasDecision = false;
    let hasDiscussion = false;
    let hasResult = false;
    for (const e of events) {
      if (!hasRound(e) || e.round !== activeRound) continue;
      if (e.type === "round-result") hasResult = true;
      if (e.type === "persona-decision" || e.type === "human-decision-pending") hasDecision = true;
      if (e.type === "persona-discussion" || e.type === "human-discussion-pending") hasDiscussion = true;
    }
    if (hasResult) phase = "reveal";
    else if (hasDecision) phase = "decision";
    else if (hasDiscussion) phase = "discussion";
    else phase = "starting";
  }

  // 5. Grouped round data
  const rounds = groupEventsByRound(events);

  // 6. Cumulative scores
  const scores: Record<number, number> = {};
  for (const e of events) {
    if (e.type === "round-result") {
      for (const [id, v] of Object.entries(e.payoffs)) {
        scores[Number(id)] = (scores[Number(id)] ?? 0) + v;
      }
    }
  }

  // 7. Per-player status in active round
  const decidedPlayers = new Set<number>();
  const discussedPlayers = new Set<number>();
  if (activeRound !== null) {
    for (const e of events) {
      if (hasRound(e) && e.round === activeRound) {
        if (e.type === "persona-decision") decidedPlayers.add(e.personaId);
        if (e.type === "human-decision-submitted") decidedPlayers.add(HUMAN_PLAYER_ID);
        if (e.type === "persona-discussion") discussedPlayers.add(e.personaId);
        if (e.type === "human-discussion-submitted") discussedPlayers.add(HUMAN_PLAYER_ID);
      }
    }
  }

  return {
    latestRound,
    completedRounds,
    activeRound,
    phase,
    rounds,
    scores,
    decidedPlayers,
    discussedPlayers,
    discussionCount: discussedPlayers.size,
  };
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

function GameLiveView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
  const { data: authSession } = useSession();
  const currentUserId = authSession?.user?.id ?? null;

  // Track locally-submitted request IDs so dialog closes immediately without waiting for SWR
  const [locallySubmittedIds, setLocallySubmittedIds] = useState<ReadonlySet<string>>(new Set());

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

  // ── Unified game state ─────────────────────────────────────────────────────

  const isCompleted = status === "completed";

  const gameState = useMemo(
    () => deriveGameState(events, isCompleted),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(events), isCompleted],
  );

  // ── Human turn detection ────────────────────────────────────────────────
  const humanParticipant = participants.find((p) => p.personaId === HUMAN_PLAYER_ID);
  const isCurrentUserHuman = humanParticipant?.userId != null && humanParticipant.userId === currentUserId;

  const pendingHumanTurn = useMemo((): PendingHumanTurn | null => {
    if (!isCurrentUserHuman) return null;
    const now = Date.now();
    for (const e of events) {
      if (
        (e.type === "human-discussion-pending" || e.type === "human-decision-pending") &&
        e.expiresAt > now &&
        !locallySubmittedIds.has(e.requestId)
      ) {
        const alreadySubmitted = events.some(
          (s) =>
            (s.type === "human-discussion-submitted" || s.type === "human-decision-submitted") &&
            s.requestId === e.requestId,
        );
        if (!alreadySubmitted) return e;
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events), isCurrentUserHuman, locallySubmittedIds]);

  // Players deliberating = in active round, decision phase, not yet decided
  const playersDeliberating = useMemo(() => {
    if (!gameState.activeRound) return new Set<number>();
    return new Set(
      participants.filter((p) => !gameState.decidedPlayers.has(p.personaId)).map((p) => p.personaId),
    );
  }, [gameState.activeRound, gameState.decidedPlayers, participants]);

  // ── Round selection ──────────────────────────────────────────────────────

  const [manualRoundId, setManualRoundId] = useState<number | null>(null);

  // Reveal hold: when a round just completed and a new round is starting,
  // hold the view on the completed round for 2.5s before advancing.
  const [revealHoldRound, setRevealHoldRound] = useState<number | null>(null);

  useEffect(() => {
    const lastCompleted = gameState.completedRounds.at(-1);
    if (lastCompleted && gameState.activeRound && gameState.activeRound > lastCompleted) {
      if (revealHoldRound !== lastCompleted) {
        setRevealHoldRound(lastCompleted);
        const timer = setTimeout(() => setRevealHoldRound(null), 2500);
        return () => clearTimeout(timer);
      }
    } else if (!gameState.activeRound) {
      setRevealHoldRound(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.completedRounds, gameState.activeRound]);

  const autoRoundId = gameState.activeRound ?? gameState.completedRounds.at(-1) ?? null;

  // Skip reveal hold when the player has an active turn or just submitted —
  // they need to see the current round, not the previous one's results.
  const skipRevealHold = isCurrentUserHuman && (!!pendingHumanTurn || locallySubmittedIds.size > 0);
  const selectedRoundId = manualRoundId ?? (skipRevealHold ? null : revealHoldRound) ?? autoRoundId;

  // Always provide round data — synthesize skeleton for rounds with only system events
  const selectedRoundData = useMemo((): RoundData | null => {
    if (selectedRoundId === null) return null;
    const found = gameState.rounds.find((r) => r.roundId === selectedRoundId);
    if (found) return found;
    if (selectedRoundId <= gameState.latestRound) {
      return { roundId: selectedRoundId, discussions: [], decisions: [], result: null };
    }
    return null;
  }, [selectedRoundId, gameState.rounds, gameState.latestRound]);

  const isLiveRound = selectedRoundId === gameState.activeRound && gameState.activeRound !== null;

  // ── Completion ────────────────────────────────────────────────────────────

  const isPending = status === "pending" || participants.length === 0;

  const winners = useMemo(() => {
    if (!isCompleted || participants.length === 0) return [] as GameSessionParticipant[];
    const maxScore = Math.max(...participants.map((p) => gameState.scores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (gameState.scores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return [] as GameSessionParticipant[];
    return leaders;
  }, [isCompleted, participants, gameState.scores]);

  const isFullTie = isCompleted && participants.length > 0 && winners.length === 0;

  function getResultState(personaId: number): PlayerResultState | undefined {
    if (!isCompleted) return undefined;
    if (isFullTie) return "tie";
    return winners.some((w) => w.personaId === personaId) ? "winner" : "loser";
  }

  // ── Result banner ─────────────────────────────────────────────────────────

  const bannerData = useMemo(() => {
    if (!isCompleted) return null;
    if (isFullTie) return { text: "Tie · Equal Scores", color: "var(--gt-warn)" };
    if (winners.length === 1) {
      const idx = participants.indexOf(winners[0]);
      return { text: `${winners[0].name} wins`, color: PLAYER_COLORS[idx] ?? "var(--gt-pos)" };
    }
    return { text: `${winners.map((w) => w.name).join(" & ")} win`, color: "var(--gt-pos)" };
  }, [isCompleted, isFullTie, winners, participants]);

  // Show results screen when game is completed and no round is manually selected
  const showResults = isCompleted && manualRoundId === null;

  // ── Round nav ─────────────────────────────────────────────────────────────

  const navRounds = [
    ...gameState.completedRounds.map((r) => ({ roundId: r, isLive: false })),
    ...(gameState.activeRound !== null ? [{ roundId: gameState.activeRound, isLive: true }] : []),
  ];

  const currentRoundNumber =
    gameState.activeRound ??
    (gameState.completedRounds.length > 0 ? gameState.completedRounds[gameState.completedRounds.length - 1] : 0);

  // Virtual index: rounds 0..n-1, results = n
  const effectiveIdx = showResults
    ? navRounds.length
    : navRounds.findIndex((r) => r.roundId === selectedRoundId);
  const maxIdx = isCompleted ? navRounds.length : navRounds.length - 1;
  const canGoPrev = effectiveIdx > 0;
  const canGoNext = effectiveIdx < maxIdx;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--gt-bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b z-10"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div
          className="mx-auto flex items-center justify-between h-[60px] px-8"
          style={{ maxWidth: "1200px" }}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[13px] transition-colors hover:underline"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              Game Theory Lab
            </Link>
            <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
            <span
              className="text-[15px] font-[600]"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              {formatGameTypeName(gameType)}
            </span>
            {!isPending && currentRoundNumber > 0 && (
              <>
                <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 text-[12px] font-[500] border"
                  style={{
                    borderRadius: "9999px",
                    color: "var(--gt-t2)",
                    borderColor: "var(--gt-border-md)",
                    fontFamily: "IBMPlexMono, monospace",
                  }}
                >
                  R{currentRoundNumber}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isCompleted && (
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/game/${token}/replay`,
                    );
                  }
                }}
                className="text-[13px] transition-colors hover:underline"
                style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
              >
                Share Replay
              </button>
            )}

            <div
              className="flex items-center gap-2 px-2.5 py-1 border"
              style={{
                borderRadius: "9999px",
                borderColor: isCompleted ? "var(--gt-border-md)" : "var(--gt-blue-border)",
                background: isCompleted ? "transparent" : "var(--gt-blue-bg)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: isCompleted
                    ? "var(--gt-t4)"
                    : isPending
                      ? "var(--gt-t4)"
                      : "var(--gt-blue)",
                  animation: !isCompleted && !isPending ? "pulse 2s infinite" : undefined,
                }}
              />
              <span
                className="text-[12px] font-[500]"
                style={{
                  color: isCompleted
                    ? "var(--gt-t3)"
                    : isPending
                      ? "var(--gt-t3)"
                      : "var(--gt-blue)",
                  fontFamily: "IBMPlexMono, monospace",
                  letterSpacing: "0.06em",
                }}
              >
                {isCompleted ? "Complete" : isPending ? "Pending" : "Live"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Result banner ───────────────────────────────────────────────────── */}
      {bannerData && (
        <div
          className="shrink-0 h-8 flex items-center justify-center gap-4 border-b"
          style={{ borderColor: "var(--gt-border)", background: `${bannerData.color}0d` }}
        >
          <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${bannerData.color}30` }} />
          <span
            className="text-[12px] font-[600]"
            style={{ color: bannerData.color, letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {bannerData.text}
          </span>
          <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${bannerData.color}30` }} />
        </div>
      )}

      {/* ── Round navigation bar ─────────────────────────────────────────────── */}
      {navRounds.length > 0 && (
        <div
          className="shrink-0 h-11 border-b flex items-stretch"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
        >
          {/* Prev arrow */}
          <button
            onClick={() => {
              if (!canGoPrev) return;
              if (showResults) {
                // From results → last completed round
                const last = gameState.completedRounds.at(-1);
                if (last !== undefined) setManualRoundId(last);
              } else {
                setManualRoundId(navRounds[effectiveIdx - 1].roundId);
              }
            }}
            disabled={!canGoPrev}
            className="shrink-0 px-4 h-full flex items-center text-[13px] transition-colors border-r"
            style={{
              color: canGoPrev ? "var(--gt-t2)" : "var(--gt-border-md)",
              borderColor: "var(--gt-border)",
              fontFamily: "IBMPlexMono, monospace",
              cursor: canGoPrev ? "pointer" : "default",
            }}
          >
            ←
          </button>

          {/* Round pills — scrollable */}
          <div className="flex-1 flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Live tab */}
            {gameState.activeRound !== null && (
              <button
                onClick={() => { setManualRoundId(null); }}
                className="flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
                style={{
                  borderBottomColor: manualRoundId === null && !isCompleted ? "var(--gt-blue)" : "transparent",
                  color: manualRoundId === null && !isCompleted ? "var(--gt-blue)" : "var(--gt-t3)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--gt-blue)" }} />
                Live
              </button>
            )}

            {navRounds.map(({ roundId, isLive }) => {
              const roundDataItem = gameState.rounds.find((r) => r.roundId === roundId);
              const payoffSum = !isLive && roundDataItem ? getRoundPayoffSum(roundDataItem) : null;
              return (
                <RoundPill
                  key={roundId}
                  roundId={roundId}
                  payoffSum={payoffSum}
                  isViewing={manualRoundId === roundId}
                  isLive={isLive}
                  onClick={() => {
                    if (isLive) setManualRoundId(null);
                    else setManualRoundId((prev) => (prev === roundId ? null : roundId));
                  }}
                />
              );
            })}

            {/* Results tab — only when game complete */}
            {isCompleted && (
              <button
                onClick={() => setManualRoundId(null)}
                className="flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
                style={{
                  borderBottomColor: showResults ? "var(--gt-pos)" : "transparent",
                  color: showResults ? "var(--gt-pos)" : "var(--gt-t3)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                Results
              </button>
            )}

            <div className="flex-1" />
          </div>

          {/* Next arrow */}
          <button
            onClick={() => {
              if (!canGoNext) return;
              if (effectiveIdx === navRounds.length - 1 && isCompleted) {
                // Last round → results
                setManualRoundId(null);
              } else {
                const next = navRounds[effectiveIdx + 1];
                if (next.isLive) setManualRoundId(null);
                else setManualRoundId(next.roundId);
              }
            }}
            disabled={!canGoNext}
            className="shrink-0 px-4 h-full flex items-center text-[13px] transition-colors border-l"
            style={{
              color: canGoNext ? "var(--gt-t2)" : "var(--gt-border-md)",
              borderColor: "var(--gt-border)",
              fontFamily: "IBMPlexMono, monospace",
              cursor: canGoNext ? "pointer" : "default",
            }}
          >
            →
          </button>
        </div>
      )}

      {/* ── Round content area ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isPending ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--gt-border-md)" }}
                />
              ))}
            </div>
            <span
              className="text-[12px] uppercase"
              style={{
                color: "var(--gt-t4)",
                fontFamily: "IBMPlexMono, monospace",
                letterSpacing: "0.12em",
              }}
            >
              Awaiting players
            </span>
          </div>
        ) : showResults ? (
          <ResultsView
            events={events}
            participants={participants}
            cumulativeScores={gameState.scores}
            winners={winners}
            isFullTie={isFullTie}
            gameType={gameType}
          />
        ) : (
          <RoundDetailView
            roundData={selectedRoundData}
            participants={participants}
            scoresForRound={selectedRoundId !== null ? getScoresUpToRound(gameState.rounds, selectedRoundId) : gameState.scores}
            isLive={isLiveRound}
            phase={isLiveRound ? gameState.phase : (selectedRoundData?.result ? "reveal" : "starting")}
            discussionCount={isLiveRound ? gameState.discussionCount : (selectedRoundData?.discussions.length ?? 0)}
            totalPlayers={participants.length}
            isHumanPlayer={isCurrentUserHuman}
            pendingHumanTurn={pendingHumanTurn}
            playersDeliberating={playersDeliberating}
            discussedPlayers={isLiveRound ? gameState.discussedPlayers : new Set<number>()}
            getResultState={getResultState}
          />
        )}

        {/* ── Human turn inline panel — slides up at bottom, game stays visible ── */}
        <AnimatePresence>
          {pendingHumanTurn && !showResults && !isPending && (
            <HumanInputPanel
              key={pendingHumanTurn.requestId}
              pendingTurn={pendingHumanTurn}
              token={token}
              gameTypeName={gameType}
              participants={participants}
              currentScores={gameState.scores}
              onSubmitted={() => {
                setLocallySubmittedIds((prev) => new Set([...prev, pendingHumanTurn.requestId]));
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
