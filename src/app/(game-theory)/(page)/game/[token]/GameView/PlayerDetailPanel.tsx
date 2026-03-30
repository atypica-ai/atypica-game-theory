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
import { ACTION_STYLE, PLAYER_COLORS } from "./PlayerCard";

// ── Data helpers ──────────────────────────────────────────────────────────────

function getDiscussions(
  events: GameTimeline,
  personaId: number,
  round: number,
): PersonaDiscussionEvent[] {
  return events.filter(
    (e): e is PersonaDiscussionEvent =>
      e.type === "persona-discussion" && e.personaId === personaId && e.round === round,
  );
}

function getDecision(
  events: GameTimeline,
  personaId: number,
  round: number,
): PersonaDecisionEvent | null {
  return (
    (events.find(
      (e): e is PersonaDecisionEvent =>
        e.type === "persona-decision" && e.personaId === personaId && e.round === round,
    ) ?? null)
  );
}

function getRoundPayoff(events: GameTimeline, personaId: number, round: number): number | null {
  const e = events.find(
    (ev): ev is RoundResultEvent => ev.type === "round-result" && ev.round === round,
  );
  return e ? (e.payoffs[personaId] ?? null) : null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReasoningBlock({ text }: { text: string }) {
  return (
    <div
      className="p-3 border border-white/[0.04] mt-2"
      style={{ background: "rgba(27,255,27,0.015)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "rgba(27,255,27,0.35)" }} />
        <span
          className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase"
          style={{ color: "rgba(27,255,27,0.35)" }}
        >
          Intercepted · Private
        </span>
      </div>
      <p className="font-InstrumentSerif italic text-[12px] leading-relaxed text-zinc-400">
        {text}
      </p>
    </div>
  );
}

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
  const actionStyle = ACTION_STYLE[actionKey];

  const hasContent = discussions.length > 0 || decision !== null;
  if (!hasContent) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Round label */}
      <div className="flex items-center gap-2">
        <span
          className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 border"
          style={{
            color: isCurrent ? color : "#52525b",
            borderColor: isCurrent ? `${color}30` : "rgba(255,255,255,0.06)",
            background: isCurrent ? `${color}08` : "transparent",
          }}
        >
          Round {roundId}{isCurrent ? " · Current" : ""}
        </span>
        {isCurrent && (
          <motion.span
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: color }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
      </div>

      {/* Discussion messages */}
      {discussions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-700">
            Discussion
          </span>
          {discussions.map((d, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <p className="font-InstrumentSerif italic text-[13px] leading-relaxed text-zinc-300">
                &ldquo;{d.content}&rdquo;
              </p>
              {d.reasoning && <ReasoningBlock text={d.reasoning} />}
            </div>
          ))}
        </div>
      )}

      {/* Decision */}
      {decision && (
        <div className="flex flex-col gap-1">
          <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-700">
            Decision
          </span>
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center px-3 py-1.5 border"
              style={
                actionStyle
                  ? { borderColor: `${actionStyle.color}35`, background: actionStyle.bg }
                  : { borderColor: "rgba(255,255,255,0.08)", background: "transparent" }
              }
            >
              <span
                className="font-IBMPlexMono text-[10px] tracking-[0.14em] uppercase font-medium"
                style={{ color: actionStyle?.color ?? "#71717a" }}
              >
                {(actionStyle?.label ?? actionKey) || "—"}
              </span>
            </div>
            {payoff !== null && (
              <span
                className="font-EuclidCircularA text-2xl font-light tabular-nums"
                style={{ color: payoff > 0 ? "#1bff1b" : "#ef4444" }}
              >
                +{payoff}
              </span>
            )}
          </div>
          {decision.reasoning && <ReasoningBlock text={decision.reasoning} />}
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
  winners,
  isFullTie,
  onClose,
}: PlayerDetailPanelProps) {
  const isOpen = personaId !== null;
  const participant = participants.find((p) => p.personaId === personaId);
  const playerIndex = participant ? participants.indexOf(participant) : 0;
  const color = PLAYER_COLORS[playerIndex] ?? "#ffffff";
  const cumScore = personaId !== null ? (cumulativeScores[personaId] ?? 0) : 0;

  // All rounds in display order: active round first, then completed rounds newest-first
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
            style={{ background: "rgba(9,9,11,0.6)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="absolute top-0 right-0 h-full w-[400px] z-30 flex flex-col border-l border-white/[0.06] bg-[#0a0a0d] overflow-hidden"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* ── Panel header ───────────────────────────────── */}
            <div className="shrink-0 flex items-start gap-3 px-6 py-5 border-b border-white/[0.05]">
              <HippyGhostAvatar seed={personaId} className="size-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-EuclidCircularA text-base font-medium text-white leading-tight truncate">
                  {participant.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600">
                    Score
                  </span>
                  <span
                    className="font-EuclidCircularA text-2xl font-light tabular-nums leading-none"
                    style={{ color }}
                  >
                    {cumScore}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1L11 11M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* ── Scrollable content ─────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col gap-px">
                {allRounds.map((roundId) => (
                  <div key={roundId} className="px-6 py-5 border-b border-white/[0.04]">
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
                  <div className="px-6 py-8 text-center">
                    <span className="font-IBMPlexMono text-[9px] tracking-[0.18em] uppercase text-zinc-700">
                      No activity yet
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Compact history summary (sticky footer) ────── */}
            {completedRoundIds.length > 0 && (
              <div className="shrink-0 border-t border-white/[0.05] px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase text-zinc-700">
                    All Rounds
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[...completedRoundIds].reverse().map((roundId) => {
                    const dec = getDecision(events, personaId, roundId);
                    const pay = getRoundPayoff(events, personaId, roundId);
                    const ak = (dec?.content as Record<string, string> | undefined)?.action ?? "";
                    const as_ = ACTION_STYLE[ak];
                    return (
                      <div key={roundId} className="flex items-center gap-3">
                        <span className="font-IBMPlexMono text-[9px] tracking-[0.12em] uppercase text-zinc-700 w-6 shrink-0">
                          R{roundId}
                        </span>
                        {as_ ? (
                          <span
                            className="font-IBMPlexMono text-[9px] tracking-[0.12em] uppercase"
                            style={{ color: as_.color }}
                          >
                            {as_.label}
                          </span>
                        ) : dec ? (
                          <span className="font-IBMPlexMono text-[9px] tracking-[0.12em] uppercase text-zinc-600">
                            {ak || "—"}
                          </span>
                        ) : (
                          <span className="font-IBMPlexMono text-[9px] text-zinc-800">—</span>
                        )}
                        {pay !== null && (
                          <span
                            className="font-EuclidCircularA text-sm font-light tabular-nums ml-auto"
                            style={{ color: pay > 0 ? "#1bff1b" : "#ef4444" }}
                          >
                            +{pay}
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
