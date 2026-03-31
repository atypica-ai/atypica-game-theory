"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import {
  GameSessionParticipant,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { groupEventsByRound, RoundDetailView } from "./ActivityFeed";
import { ParticipantTile, PlayerResultState, PLAYER_COLORS } from "./PlayerCard";
import { ReplayView } from "./ReplayView";
import { RoundPill } from "./RoundView";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRoundPayoffSum(
  round: ReturnType<typeof groupEventsByRound>[number],
): number {
  if (!round.result) return 0;
  return Object.values(round.result.payoffs).reduce((acc, v) => acc + v, 0);
}

function getDecisionForRound(
  decisions: ReturnType<typeof groupEventsByRound>[number]["decisions"],
  personaId: number,
): string {
  const e = decisions.find((d) => d.personaId === personaId);
  return e ? ((e.content as Record<string, string>).action ?? "") : "";
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

function GameLiveView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
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

  // All events grouped by round
  const allRoundData = useMemo(
    () => groupEventsByRound(events),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(events)],
  );

  // Players deliberating = in active round but haven't posted a decision yet
  const playersDeliberating = useMemo(() => {
    if (activeRoundId === null) return new Set<number>();
    const decided = new Set(
      events
        .filter(
          (e): e is PersonaDecisionEvent =>
            e.type === "persona-decision" && e.round === activeRoundId,
        )
        .map((e) => e.personaId),
    );
    return new Set(
      participants.filter((p) => !decided.has(p.personaId)).map((p) => p.personaId),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events), activeRoundId, participants]);

  // ── UI state ──────────────────────────────────────────────────────────────

  // null = auto-follow active round; number = user locked to specific round
  const [manualRoundId, setManualRoundId] = useState<number | null>(null);

  // Derived selected round: manual choice → active round → most recent completed
  const selectedRoundId =
    manualRoundId ?? activeRoundId ?? completedRoundIds.at(-1) ?? null;

  const selectedRoundData =
    selectedRoundId !== null
      ? (allRoundData.find((r) => r.roundId === selectedRoundId) ?? null)
      : null;

  const isLiveRound = selectedRoundId === activeRoundId && activeRoundId !== null;

  // ── Completion ────────────────────────────────────────────────────────────

  const isCompleted = status === "completed";
  const isPending = status === "pending" || participants.length === 0;

  const winners = useMemo(() => {
    if (!isCompleted || participants.length === 0) return [] as GameSessionParticipant[];
    const maxScore = Math.max(...participants.map((p) => cumulativeScores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (cumulativeScores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return [] as GameSessionParticipant[];
    return leaders;
  }, [isCompleted, participants, cumulativeScores]);

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

  // ── Round nav ─────────────────────────────────────────────────────────────

  const navRounds = [
    ...completedRoundIds.map((r) => ({ roundId: r, isLive: false })),
    ...(activeRoundId !== null ? [{ roundId: activeRoundId, isLive: true }] : []),
  ];

  const currentRoundNumber =
    activeRoundId ??
    (completedRoundIds.length > 0 ? completedRoundIds[completedRoundIds.length - 1] : 0);

  // Prev / next for round nav arrows
  const selectedIdx = navRounds.findIndex((r) => r.roundId === selectedRoundId);
  const canGoPrev = selectedIdx > 0;
  const canGoNext = selectedIdx < navRounds.length - 1;

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

      {/* ── Participant strip ────────────────────────────────────────────────── */}
      {!isPending && participants.length > 0 && (
        <div
          className="shrink-0 border-b"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-bg)" }}
        >
          <div
            className="mx-auto flex items-center gap-3 px-8 py-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ maxWidth: "1200px" }}
          >
            {participants.map((p, i) => {
              const roundData = selectedRoundData;
              const actionKey = roundData
                ? getDecisionForRound(roundData.decisions, p.personaId)
                : "";
              const isDeliberating = isLiveRound && playersDeliberating.has(p.personaId);

              return (
                <ParticipantTile
                  key={p.personaId}
                  participant={p}
                  playerIndex={i}
                  score={cumulativeScores[p.personaId] ?? 0}
                  actionKey={actionKey || undefined}
                  isDeliberating={isDeliberating}
                  resultState={getResultState(p.personaId)}
                />
              );
            })}
          </div>
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
              if (canGoPrev) {
                setManualRoundId(navRounds[selectedIdx - 1].roundId);
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
            {activeRoundId !== null && (
              <button
                onClick={() => setManualRoundId(null)}
                className="flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
                style={{
                  borderBottomColor:
                    manualRoundId === null ? "var(--gt-blue)" : "transparent",
                  color:
                    manualRoundId === null ? "var(--gt-blue)" : "var(--gt-t3)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: "var(--gt-blue)" }}
                />
                Live
              </button>
            )}

            {navRounds.map(({ roundId, isLive }) => {
              const roundDataItem = allRoundData.find((r) => r.roundId === roundId);
              const payoffSum = !isLive && roundDataItem ? getRoundPayoffSum(roundDataItem) : null;
              return (
                <RoundPill
                  key={roundId}
                  roundId={roundId}
                  payoffSum={payoffSum}
                  isViewing={manualRoundId === roundId}
                  isLive={isLive}
                  onClick={() => {
                    if (isLive) {
                      setManualRoundId(null);
                    } else {
                      setManualRoundId((prev) => (prev === roundId ? null : roundId));
                    }
                  }}
                />
              );
            })}

            <div className="flex-1" />
          </div>

          {/* Next arrow */}
          <button
            onClick={() => {
              if (canGoNext) {
                const next = navRounds[selectedIdx + 1];
                if (next.isLive) {
                  setManualRoundId(null);
                } else {
                  setManualRoundId(next.roundId);
                }
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
        ) : (
          <RoundDetailView
            roundData={selectedRoundData}
            participants={participants}
            isLive={isLiveRound}
            playersDeliberating={playersDeliberating}
          />
        )}
      </div>
    </div>
  );
}
