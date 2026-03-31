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
import { ActionPill, PLAYER_COLORS } from "./PlayerCard";

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

function getPlayerColor(participants: GameSessionParticipant[], personaId: number): string {
  const idx = participants.findIndex((p) => p.personaId === personaId);
  return PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
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
  const color = getPlayerColor(participants, event.personaId);

  return (
    <div className="flex gap-4 px-6 py-5 border-b last:border-b-0" style={{ borderColor: "var(--gt-border)" }}>
      <HippyGhostAvatar seed={event.personaId} className="size-9 rounded-full shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[14px] font-[500]" style={{ color }}>
            {event.personaName}
          </span>
          {event.reasoning && (
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="text-[11px] transition-colors hover:underline"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
            >
              {showReasoning ? "hide thoughts" : "show thoughts"}
            </button>
          )}
        </div>
        <p
          className="text-[15px] italic leading-relaxed"
          style={{ color: "var(--gt-t1)", fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          &ldquo;{event.content}&rdquo;
        </p>
        {showReasoning && event.reasoning && (
          <div className="mt-3 pl-4 border-l" style={{ borderColor: "var(--gt-border-md)" }}>
            <p
              className="text-[11px] uppercase mb-1.5"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              Inner monologue
            </p>
            <p
              className="text-[13px] italic leading-relaxed"
              style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif" }}
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
  isLive: boolean;
  playersDeliberating: Set<number>;
}

export function RoundDetailView({
  roundData,
  participants,
  isLive,
  playersDeliberating,
}: RoundDetailViewProps) {
  if (!roundData) {
    return (
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
    );
  }

  const hasDiscussion = roundData.discussions.length > 0;
  const hasDecisions = roundData.decisions.length > 0;
  const hasResult = roundData.result !== null;

  const deliberatingParticipants = isLive
    ? participants.filter((p) => playersDeliberating.has(p.personaId))
    : [];

  return (
    <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto py-8 px-6" style={{ maxWidth: "800px" }}>

        {/* ── Round header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
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
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: "var(--gt-blue)" }}
                />
                live
              </span>
            )}
          </div>
          {hasResult && roundData.result && (
            <span className="text-[13px]" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}>
              pool{" "}
              <span className="font-[600]" style={{ color: "var(--gt-t1)" }}>
                {Object.values(roundData.result.payoffs).reduce((a, v) => a + v, 0)}
              </span>
            </span>
          )}
        </div>

        {/* ── Deliberating status ───────────────────────────────────────── */}
        {deliberatingParticipants.length > 0 && (
          <div className="mb-8 flex items-center gap-2 flex-wrap">
            {deliberatingParticipants.map((p) => {
              const color = getPlayerColor(participants, p.personaId);
              return (
                <div
                  key={p.personaId}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border"
                  style={{
                    borderRadius: "9999px",
                    borderColor: "var(--gt-border)",
                    background: "var(--gt-surface)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                  <span className="text-[12px] font-[500]" style={{ color }}>
                    {p.name}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
                  >
                    deliberating
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Discussion ───────────────────────────────────────────────── */}
        {hasDiscussion && (
          <section className="mb-8">
            <p
              className="text-[11px] uppercase mb-3"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              Discussion
            </p>
            <div
              className="overflow-hidden"
              style={{
                border: "1px solid var(--gt-border)",
                borderRadius: "0.5rem",
                background: "var(--gt-surface)",
              }}
            >
              {roundData.discussions.map((d, i) => (
                <DiscussionEntry key={i} event={d} participants={participants} />
              ))}
            </div>
          </section>
        )}

        {/* ── Decisions ────────────────────────────────────────────────── */}
        {hasDecisions && (
          <section className="mb-8">
            <p
              className="text-[11px] uppercase mb-3"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              Decisions
            </p>
            <div
              className="overflow-hidden"
              style={{
                border: "1px solid var(--gt-border)",
                borderRadius: "0.5rem",
                background: "var(--gt-surface)",
              }}
            >
              {roundData.decisions.map((d) => {
                const color = getPlayerColor(participants, d.personaId);
                const actionKey = (d.content as Record<string, string>).action ?? "";
                return (
                  <div
                    key={d.personaId}
                    className="flex items-start gap-4 px-6 py-5 border-b last:border-b-0"
                    style={{ borderColor: "var(--gt-border)" }}
                  >
                    <HippyGhostAvatar
                      seed={d.personaId}
                      className="size-9 rounded-full shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[14px] font-[500]" style={{ color }}>
                          {d.personaName}
                        </span>
                        <ActionPill actionKey={actionKey} />
                      </div>
                      {d.reasoning && (
                        <p
                          className="text-[13px] italic leading-relaxed"
                          style={{
                            color: "var(--gt-t3)",
                            fontFamily: "'Instrument Serif', Georgia, serif",
                          }}
                        >
                          {d.reasoning}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Payoffs ──────────────────────────────────────────────────── */}
        {hasResult && roundData.result && (
          <section>
            <p
              className="text-[11px] uppercase mb-3"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              Payoffs
            </p>
            <div
              className="overflow-hidden"
              style={{
                border: "1px solid var(--gt-border)",
                borderRadius: "0.5rem",
                background: "var(--gt-surface)",
              }}
            >
              {participants.map((p) => {
                const payoff = roundData.result!.payoffs[p.personaId];
                if (payoff === undefined) return null;
                const color = getPlayerColor(participants, p.personaId);
                return (
                  <div
                    key={p.personaId}
                    className="flex items-center gap-4 px-6 py-5 border-b last:border-b-0"
                    style={{ borderColor: "var(--gt-border)" }}
                  >
                    <HippyGhostAvatar seed={p.personaId} className="size-9 rounded-full shrink-0" />
                    <span
                      className="flex-1 text-[15px] font-[500] truncate"
                      style={{ color }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="text-[32px] font-[600] tabular-nums leading-none"
                      style={{
                        color: payoff >= 0 ? "var(--gt-pos)" : "var(--gt-neg)",
                        letterSpacing: "var(--gt-tracking-tight)",
                      }}
                    >
                      {payoff > 0 ? "+" : ""}{payoff}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
