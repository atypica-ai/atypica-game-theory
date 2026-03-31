"use client";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useState } from "react";
import { PlayerResultState, PLAYER_COLORS } from "./PlayerCard";

// ── Data model ────────────────────────────────────────────────────────────────

export type RoundData = {
  roundId: number;
  discussions: PersonaDiscussionEvent[];
  decisions: PersonaDecisionEvent[];
  result: RoundResultEvent | null;
};

export function groupEventsByRound(events: GameTimeline): RoundData[] {
  const map = new Map<number, RoundData>();

  for (const e of events) {
    if (e.type === "persona-discussion") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.discussions.push(e);
      map.set(e.round, r);
    } else if (e.type === "persona-decision") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.decisions.push(e);
      map.set(e.round, r);
    } else if (e.type === "round-result") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.result = e;
      map.set(e.round, r);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.roundId - b.roundId);
}

// ── Decision extraction ───────────────────────────────────────────────────────

type DecisionDisplay =
  | { type: "named"; key: string }
  | { type: "numeric"; value: number }
  | { type: "raw"; text: string };

function extractDecision(content: unknown): DecisionDisplay {
  if (typeof content !== "object" || content === null) return { type: "raw", text: String(content) };
  const c = content as Record<string, unknown>;
  if (typeof c.action === "string") return { type: "named", key: c.action };
  if (typeof c.number === "number") return { type: "numeric", value: c.number };
  const first = Object.values(c)[0];
  return { type: "raw", text: first !== undefined ? String(first) : "?" };
}

// ── Action styles ─────────────────────────────────────────────────────────────

const ACTION_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  cooperate: { color: "var(--gt-pos)", bg: "var(--gt-pos-bg)", border: "hsl(125 49% 43% / 0.25)", label: "Cooperate" },
  defect:    { color: "var(--gt-neg)", bg: "var(--gt-neg-bg)", border: "hsl(2 63% 54% / 0.25)",   label: "Defect" },
  stag:      { color: "var(--gt-blue)", bg: "var(--gt-blue-bg)", border: "var(--gt-blue-border)", label: "Stag" },
  rabbit:    { color: "var(--gt-warn)", bg: "var(--gt-warn-bg)", border: "hsl(48 93% 45% / 0.3)", label: "Rabbit" },
};

function DecisionBadge({ decision }: { decision: DecisionDisplay }) {
  if (decision.type === "numeric") {
    return (
      <span
        className="text-[32px] font-[700] tabular-nums leading-none"
        style={{
          color: "var(--gt-t1)",
          fontFamily: "IBMPlexMono, monospace",
          letterSpacing: "var(--gt-tracking-tight)",
        }}
      >
        {decision.value}
      </span>
    );
  }
  const key = decision.type === "named" ? decision.key : decision.text;
  const style = ACTION_STYLE[key];
  return (
    <span
      className="inline-flex items-center px-3 py-1.5 text-[13px] font-[500] leading-none whitespace-nowrap"
      style={
        style
          ? { borderRadius: "9999px", border: `1px solid ${style.border}`, background: style.bg, color: style.color }
          : { borderRadius: "9999px", border: "1px solid var(--gt-border-md)", background: "transparent", color: "var(--gt-t3)" }
      }
    >
      {style?.label ?? key}
    </span>
  );
}

// ── Player card — unified identity + round state ──────────────────────────────

function PlayerCard({
  participant,
  playerIndex,
  score,
  decision,
  payoff,
  isDeliberating,
  resultState,
}: {
  participant: GameSessionParticipant;
  playerIndex: number;
  score: number;
  decision: PersonaDecisionEvent | undefined;
  payoff: number | undefined;
  isDeliberating: boolean;
  resultState: PlayerResultState | undefined;
}) {
  const color = PLAYER_COLORS[playerIndex] ?? PLAYER_COLORS[0];
  const isWinner = resultState === "winner";
  const isLoser = resultState === "loser";
  const hasDecision = !!decision;
  const hasPayoff = payoff !== undefined;
  const decisionDisplay = hasDecision ? extractDecision(decision!.content) : null;

  return (
    <div
      className="flex flex-col overflow-hidden transition-all duration-300"
      style={{
        background: "var(--gt-surface)",
        border: `1px solid ${isWinner ? color : "var(--gt-border)"}`,
        borderRadius: "0.625rem",
        opacity: isLoser ? 0.45 : 1,
        boxShadow: isWinner ? `0 0 0 1px ${color}, 0 8px 32px ${color}22` : undefined,
      }}
    >
      {/* Color bar */}
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: color }} />

      {/* Identity + score */}
      <div className="flex flex-col items-center gap-2 px-5 pt-6 pb-5">
        <div
          className="rounded-full"
          style={{
            outline: isWinner ? `2px solid ${color}` : undefined,
            outlineOffset: isWinner ? 3 : undefined,
          }}
        >
          <HippyGhostAvatar seed={participant.personaId} className="size-12 rounded-full" />
        </div>

        <span
          className="text-[15px] font-[600] text-center leading-tight"
          style={{
            color: isWinner ? color : "var(--gt-t1)",
            fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
            letterSpacing: "var(--gt-tracking-tight)",
          }}
        >
          {participant.name}
        </span>

        <span
          className="tabular-nums leading-none font-[700]"
          style={{
            fontSize: "clamp(2.5rem, 4vw, 3.25rem)",
            color,
            fontFamily: "IBMPlexMono, monospace",
            letterSpacing: "var(--gt-tracking-tight)",
          }}
        >
          {score}
        </span>
      </div>

      {/* Round-contextual state */}
      <div
        className="flex flex-col items-center justify-center gap-1.5 px-5 py-4 border-t min-h-[64px]"
        style={{ borderColor: "var(--gt-border)" }}
      >
        {!hasDecision && isDeliberating && (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color, animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        )}

        {!hasDecision && !isDeliberating && (
          <span
            className="text-[13px]"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
          >
            —
          </span>
        )}

        {hasDecision && decisionDisplay && (
          <div
            className="flex flex-col items-center gap-1.5"
            style={{ animation: "gtFadeUp 0.25s ease-out" }}
          >
            <DecisionBadge decision={decisionDisplay} />
            {hasPayoff && (
              <span
                className="text-[14px] font-[700] tabular-nums leading-none"
                style={{
                  color: payoff! >= 0 ? "var(--gt-pos)" : "var(--gt-neg)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                {payoff! > 0 ? "+" : ""}{payoff}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Discussion entry ──────────────────────────────────────────────────────────

function DiscussionEntry({
  event,
  participants,
}: {
  event: PersonaDiscussionEvent;
  participants: GameSessionParticipant[];
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const idx = participants.findIndex((p) => p.personaId === event.personaId);
  const color = PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];

  return (
    <div
      className="flex gap-3 px-5 py-4 border-b last:border-b-0"
      style={{ borderColor: "var(--gt-border)" }}
    >
      <HippyGhostAvatar seed={event.personaId} className="size-8 rounded-full shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[13px] font-[500]"
            style={{
              color,
              fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          >
            {event.personaName}
          </span>
          {event.reasoning && (
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="text-[11px] transition-colors hover:underline"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
            >
              {showReasoning ? "hide" : "thoughts"}
            </button>
          )}
        </div>
        <p
          className="text-[13px] leading-relaxed"
          style={{
            color: "var(--gt-t2)",
            fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
          }}
        >
          &ldquo;{event.content}&rdquo;
        </p>
        {showReasoning && event.reasoning && (
          <div className="mt-2 pl-3 border-l" style={{ borderColor: "var(--gt-border-md)" }}>
            <p
              className="text-[12px] leading-relaxed"
              style={{
                color: "var(--gt-t3)",
                fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
              }}
            >
              {event.reasoning}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Round detail view ─────────────────────────────────────────────────────────

export interface RoundDetailViewProps {
  roundData: RoundData | null;
  participants: GameSessionParticipant[];
  scoresForRound: Record<number, number>;
  isLive: boolean;
  playersDeliberating: Set<number>;
  getResultState: (personaId: number) => PlayerResultState | undefined;
}

export function RoundDetailView({
  roundData,
  participants,
  scoresForRound,
  isLive,
  playersDeliberating,
  getResultState,
}: RoundDetailViewProps) {
  const [showDiscussion, setShowDiscussion] = useState(false);

  if (!roundData) {
    return (
      <>
        <style>{`@keyframes gtFadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--gt-border-md)", animationDelay: `${i * 0.25}s` }}
              />
            ))}
          </div>
          <span
            className="text-[12px] uppercase"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.12em" }}
          >
            Awaiting activity
          </span>
        </div>
      </>
    );
  }

  const hasDiscussion = roundData.discussions.length > 0;
  const hasResult = roundData.result !== null;
  const cols = participants.length <= 2 ? 2 : participants.length === 3 ? 3 : 4;

  return (
    <>
      <style>{`@keyframes gtFadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto py-8 px-8" style={{ maxWidth: "960px" }}>

          {/* ── Round header ───────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span
                className="text-[13px] font-[600] uppercase"
                style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.12em" }}
              >
                Round {roundData.roundId}
              </span>
              {isLive && !hasResult && (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 border"
                  style={{
                    borderRadius: "9999px",
                    color: "var(--gt-blue)",
                    borderColor: "var(--gt-blue-border)",
                    background: "var(--gt-blue-bg)",
                    fontFamily: "IBMPlexMono, monospace",
                    letterSpacing: "0.06em",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--gt-blue)" }} />
                  live
                </span>
              )}
            </div>
            {hasResult && roundData.result && (
              <span className="text-[13px]" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}>
                pool <span className="font-[600]" style={{ color: "var(--gt-t1)" }}>{Object.values(roundData.result.payoffs).reduce((a, v) => a + v, 0)}</span>
              </span>
            )}
          </div>

          {/* ── Player card grid ───────────────────────────────────────── */}
          <section className="mb-8">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {participants.map((p, i) => (
                <PlayerCard
                  key={p.personaId}
                  participant={p}
                  playerIndex={i}
                  score={scoresForRound[p.personaId] ?? 0}
                  decision={roundData.decisions.find((d) => d.personaId === p.personaId)}
                  payoff={roundData.result?.payoffs[p.personaId]}
                  isDeliberating={isLive && playersDeliberating.has(p.personaId)}
                  resultState={getResultState(p.personaId)}
                />
              ))}
            </div>
          </section>

          {/* ── Discussion — collapsed by default ─────────────────────── */}
          {hasDiscussion && (
            <section>
              <button
                onClick={() => setShowDiscussion((v) => !v)}
                className="flex items-center gap-2 mb-3 w-full text-left"
              >
                <span
                  className="text-[11px] uppercase"
                  style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
                >
                  Discussion ({roundData.discussions.length})
                </span>
                <span
                  className="text-[13px] transition-transform duration-150"
                  style={{
                    color: "var(--gt-t4)",
                    display: "inline-block",
                    transform: showDiscussion ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  ›
                </span>
              </button>
              {showDiscussion && (
                <div
                  className="overflow-hidden"
                  style={{ border: "1px solid var(--gt-border)", borderRadius: "0.5rem", background: "var(--gt-surface)" }}
                >
                  {roundData.discussions.map((d, i) => (
                    <DiscussionEntry key={i} event={d} participants={participants} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
