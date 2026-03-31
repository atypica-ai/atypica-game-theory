"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import Link from "next/link";
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

function getDecisionForRound(events: GameTimeline, personaId: number, round: number): string {
  const e = events.find(
    (ev): ev is PersonaDecisionEvent =>
      ev.type === "persona-decision" && ev.personaId === personaId && ev.round === round,
  );
  return e ? ((e.content as Record<string, string>).action ?? "") : "";
}

function formatGameTypeName(key: string): string {
  return key.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
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

// ── Leaderboard table ─────────────────────────────────────────────────────────

interface LeaderboardProps {
  rankedParticipants: Array<{ p: GameSessionParticipant; i: number }>;
  events: GameTimeline;
  cumulativeScores: Record<number, number>;
  completedRoundIds: number[];
  activeRoundId: number | null;
  getResultState: (personaId: number) => PlayerResultState | undefined;
  onSelectPersona: (personaId: number) => void;
}

function GameLeaderboard({
  rankedParticipants,
  events,
  cumulativeScores,
  completedRoundIds,
  activeRoundId,
  getResultState,
  onSelectPersona,
}: LeaderboardProps) {
  // All rounds with any data (completed + active)
  const displayRounds = useMemo(() => {
    const ids = new Set([...completedRoundIds]);
    if (activeRoundId !== null) ids.add(activeRoundId);
    return Array.from(ids).sort((a, b) => a - b);
  }, [completedRoundIds, activeRoundId]);

  return (
    <div className="border-b" style={{ borderColor: "var(--gt-border)" }}>
      <div className="mx-auto overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ maxWidth: "1200px" }}>
      <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--gt-row-alt)", borderBottom: "1px solid var(--gt-border)" }}>
            <th className="w-10 pl-6 pr-3 py-3 text-right tabular-nums text-[11px] font-normal uppercase" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}>
              #
            </th>
            <th className="py-3 pr-6 text-[11px] font-normal uppercase" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}>
              Player
            </th>
            {displayRounds.map((r) => (
              <th key={r} className="py-3 px-4 text-[11px] font-normal uppercase" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}>
                R{r}
              </th>
            ))}
            <th className="py-3 pl-4 pr-6 text-right text-[11px] font-normal uppercase" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}>
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {rankedParticipants.map(({ p, i }, rank) => {
            const roundActions = displayRounds.map((roundId) => ({
              roundId,
              actionKey: getDecisionForRound(events, p.personaId, roundId),
              payoff: completedRoundIds.includes(roundId) ? (getRoundPayoffs(events, roundId)[p.personaId] ?? null) : null,
            }));

            return (
              <ScoreboardRow
                key={p.personaId}
                participant={p}
                playerIndex={i}
                score={cumulativeScores[p.personaId] ?? 0}
                rank={rank + 1}
                roundActions={roundActions}
                resultState={getResultState(p.personaId)}
                onClick={() => onSelectPersona(p.personaId)}
              />
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
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

  // ── UI state ──────────────────────────────────────────────────────────────

  const [displayRoundId, setDisplayRoundId] = useState<number | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const isLiveView = displayRoundId === null;

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

  // ── Scoreboard ────────────────────────────────────────────────────────────

  const rankedParticipants = useMemo(() => {
    return [...participants]
      .map((p, i) => ({ p, i }))
      .sort((a, b) => {
        const diff = (cumulativeScores[b.p.personaId] ?? 0) - (cumulativeScores[a.p.personaId] ?? 0);
        return diff !== 0 ? diff : a.i - b.i;
      });
  }, [participants, cumulativeScores]);

  // ── Round tabs ────────────────────────────────────────────────────────────

  const historyBarRounds = [
    ...completedRoundIds.map((r) => ({ roundId: r, isLiveRound: false })),
    ...(activeRoundId !== null ? [{ roundId: activeRoundId, isLiveRound: true }] : []),
  ];

  const currentRoundNumber =
    activeRoundId ??
    (completedRoundIds.length > 0 ? completedRoundIds[completedRoundIds.length - 1] : 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--gt-bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b z-10"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div className="mx-auto flex items-center justify-between h-[60px] px-8" style={{ maxWidth: "1200px" }}>
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
                color: isCompleted ? "var(--gt-t3)" : isPending ? "var(--gt-t3)" : "var(--gt-blue)",
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
            style={{
              color: bannerData.color,
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          >
            {bannerData.text}
          </span>
          <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${bannerData.color}30` }} />
        </div>
      )}

      {/* ── Leaderboard table ────────────────────────────────────────────────── */}
      {!isPending && (
        <GameLeaderboard
          rankedParticipants={rankedParticipants}
          events={events}
          cumulativeScores={cumulativeScores}
          completedRoundIds={completedRoundIds}
          activeRoundId={activeRoundId}
          getResultState={getResultState}
          onSelectPersona={(id) => setSelectedPersonaId((prev) => (prev === id ? null : id))}
        />
      )}

      {/* ── Round tabs ──────────────────────────────────────────────────────── */}
      {historyBarRounds.length > 0 && (
        <div
          className="shrink-0 h-11 border-b flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
        >
          {/* "All" tab */}
          <button
            onClick={() => setDisplayRoundId(null)}
            className="flex items-center gap-1 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
            style={{
              borderBottomColor: isLiveView ? "var(--gt-blue)" : "transparent",
              color: isLiveView ? "var(--gt-blue)" : "var(--gt-t3)",
            }}
          >
            All
          </button>

          {historyBarRounds.map(({ roundId, isLiveRound }) => (
            <RoundPill
              key={roundId}
              roundId={roundId}
              payoffSum={isLiveRound ? null : getRoundPayoffSum(events, roundId)}
              isViewing={isLiveRound ? false : displayRoundId === roundId}
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
        </div>
      )}

      {/* ── Activity feed ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {isPending ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--gt-border-md)" }}
                />
              ))}
            </div>
            <span
              className="text-[11px] uppercase"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.12em" }}
            >
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

        {/* Detail panel overlays feed */}
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
    </div>
  );
}
