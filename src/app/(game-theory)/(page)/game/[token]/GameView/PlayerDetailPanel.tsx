"use client";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { AnimatePresence, motion } from "motion/react";
import { ActionPill, PLAYER_COLORS } from "./PlayerCard";

// ── Data helpers ──────────────────────────────────────────────────────────────

function getDiscussions(events: GameTimeline, personaId: number, round: number): PersonaDiscussionEvent[] {
  return events.filter(
    (e): e is PersonaDiscussionEvent =>
      e.type === "persona-discussion" && e.personaId === personaId && e.round === round,
  );
}

function getDecision(events: GameTimeline, personaId: number, round: number): PersonaDecisionEvent | null {
  return (
    events.find(
      (e): e is PersonaDecisionEvent =>
        e.type === "persona-decision" && e.personaId === personaId && e.round === round,
    ) ?? null
  );
}

function getRoundPayoff(events: GameTimeline, personaId: number, round: number): number | null {
  const e = events.find(
    (ev): ev is RoundResultEvent => ev.type === "round-result" && ev.round === round,
  );
  return e ? (e.payoffs[personaId] ?? null) : null;
}

// ── Round section ─────────────────────────────────────────────────────────────

function RoundSection({
  events,
  personaId,
  roundId,
  color,
  isCurrent,
}: {
  events: GameTimeline;
  personaId: number;
  roundId: number;
  color: string;
  isCurrent: boolean;
}) {
  const discussions = getDiscussions(events, personaId, roundId);
  const decision = getDecision(events, personaId, roundId);
  const payoff = getRoundPayoff(events, personaId, roundId);
  const actionKey = (decision?.content as Record<string, string> | undefined)?.action ?? "";

  if (discussions.length === 0 && !decision) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Round label */}
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-[600] uppercase px-2 py-0.5 border"
          style={{
            borderRadius: "9999px",
            color: isCurrent ? color : "var(--gt-t3)",
            borderColor: isCurrent ? `${color}40` : "var(--gt-border-md)",
            background: isCurrent ? `${color}0d` : "transparent",
            fontFamily: "IBMPlexMono, monospace",
            letterSpacing: "0.06em",
          }}
        >
          Round {roundId}{isCurrent ? " · Active" : ""}
        </span>
        {isCurrent && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: color }}
          />
        )}
      </div>

      {/* Discussions */}
      {discussions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            className="text-[10px] uppercase"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
          >
            Discussion
          </span>
          {discussions.map((d, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p
                className="text-[13px] italic leading-relaxed"
                style={{ color: "var(--gt-t2)", fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                &ldquo;{d.content}&rdquo;
              </p>
              {d.reasoning && (
                <div className="pl-3 border-l mt-1" style={{ borderColor: "var(--gt-border-md)" }}>
                  <p
                    className="text-[10px] uppercase mb-1"
                    style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
                  >
                    Inner monologue
                  </p>
                  <p
                    className="text-[11px] italic leading-relaxed"
                    style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    {d.reasoning}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decision */}
      {decision && (
        <div className="flex flex-col gap-1.5">
          <span
            className="text-[10px] uppercase"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
          >
            Decision
          </span>
          <div className="flex items-center gap-3">
            <ActionPill actionKey={actionKey} />
            {payoff !== null && (
              <span
                className="text-[20px] font-[600] tabular-nums leading-none"
                style={{ color: payoff >= 0 ? "var(--gt-pos)" : "var(--gt-neg)", letterSpacing: "var(--gt-tracking-tight)" }}
              >
                {payoff > 0 ? "+" : ""}{payoff}
              </span>
            )}
          </div>
          {decision.reasoning && (
            <div className="pl-3 border-l mt-1" style={{ borderColor: "var(--gt-border-md)" }}>
              <p
                className="text-[10px] uppercase mb-1"
                style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
              >
                Reasoning
              </p>
              <p
                className="text-[11px] italic leading-relaxed"
                style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                {decision.reasoning}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface PlayerDetailPanelProps {
  personaId: number | null;
  participants: GameSessionParticipant[];
  events: GameTimeline;
  completedRoundIds: number[];
  activeRoundId: number | null;
  cumulativeScores: Record<number, number>;
  winners: GameSessionParticipant[];
  isFullTie: boolean;
  onClose: () => void;
}

export function PlayerDetailPanel({
  personaId,
  participants,
  events,
  completedRoundIds,
  activeRoundId,
  cumulativeScores,
  onClose,
}: PlayerDetailPanelProps) {
  const isOpen = personaId !== null;
  const participant = participants.find((p) => p.personaId === personaId);
  const playerIndex = participant ? participants.indexOf(participant) : 0;
  const color = PLAYER_COLORS[playerIndex] ?? PLAYER_COLORS[0];
  const cumScore = personaId !== null ? (cumulativeScores[personaId] ?? 0) : 0;

  const allRounds: number[] = [];
  if (activeRoundId !== null) allRounds.push(activeRoundId);
  for (const r of [...completedRoundIds].reverse()) {
    if (r !== activeRoundId) allRounds.push(r);
  }

  return (
    <AnimatePresence>
      {isOpen && personaId !== null && participant && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: "hsl(36 45% 98% / 0.7)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="absolute top-0 right-0 h-full w-[380px] z-30 flex flex-col overflow-hidden"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              background: "var(--gt-surface)",
              borderLeft: "1px solid var(--gt-border)",
            }}
          >
            {/* Header */}
            <div
              className="shrink-0 flex items-start gap-3 px-5 py-4 border-b"
              style={{ borderColor: "var(--gt-border)" }}
            >
              <HippyGhostAvatar seed={personaId} className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[15px] font-[600] leading-tight truncate"
                  style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
                >
                  {participant.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[11px] uppercase"
                    style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.06em" }}
                  >
                    Score
                  </span>
                  <span
                    className="text-[22px] font-[600] tabular-nums leading-none"
                    style={{ color, letterSpacing: "var(--gt-tracking-tight)" }}
                  >
                    {cumScore}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-7 h-7 flex items-center justify-center transition-colors"
                style={{ color: "var(--gt-t4)" }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {allRounds.map((roundId) => (
                <div
                  key={roundId}
                  className="px-5 py-4 border-b"
                  style={{ borderColor: "var(--gt-border)" }}
                >
                  <RoundSection
                    events={events}
                    personaId={personaId}
                    roundId={roundId}
                    color={color}
                    isCurrent={roundId === activeRoundId}
                  />
                </div>
              ))}
              {allRounds.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <span
                    className="text-[11px] uppercase"
                    style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
                  >
                    No activity yet
                  </span>
                </div>
              )}
            </div>

            {/* Footer summary */}
            {completedRoundIds.length > 0 && (
              <div
                className="shrink-0 border-t px-5 py-4"
                style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
              >
                <span
                  className="text-[10px] uppercase block mb-2"
                  style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
                >
                  Round Summary
                </span>
                <div className="flex flex-col gap-1.5">
                  {[...completedRoundIds].reverse().map((roundId) => {
                    const dec = getDecision(events, personaId, roundId);
                    const pay = getRoundPayoff(events, personaId, roundId);
                    const ak = (dec?.content as Record<string, string> | undefined)?.action ?? "";
                    return (
                      <div key={roundId} className="flex items-center gap-3">
                        <span
                          className="text-[11px] uppercase w-5 shrink-0"
                          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
                        >
                          R{roundId}
                        </span>
                        {ak ? (
                          <ActionPill actionKey={ak} />
                        ) : (
                          <span className="text-[11px]" style={{ color: "var(--gt-t4)" }}>—</span>
                        )}
                        {pay !== null && (
                          <span
                            className="text-[12px] font-[600] tabular-nums ml-auto"
                            style={{ color: pay >= 0 ? "var(--gt-pos)" : "var(--gt-neg)" }}
                          >
                            {pay > 0 ? "+" : ""}{pay}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
