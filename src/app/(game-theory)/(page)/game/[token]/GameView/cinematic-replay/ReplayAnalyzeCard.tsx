"use client";

import {
  GameSessionParticipant,
  HUMAN_PLAYER_ID,
  PersonaDecisionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { BarChart3, Cpu, RefreshCw, Trophy, User } from "lucide-react";
import { motion } from "motion/react";
import { ACTION_STYLE } from "../PlayerCard";
import { ReasoningTooltip } from "./ReasoningTooltip";

// ── Decision display helpers ─────────────────────────────────────────────────

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

function DecisionBadge({ decision }: { decision: DecisionDisplay }) {
  if (decision.type === "numeric") {
    return (
      <span
        className="text-sm font-bold tabular-nums"
        style={{ fontFamily: "IBMPlexMono, monospace", color: "var(--gt-t1)" }}
      >
        {decision.value}
      </span>
    );
  }
  const key = decision.type === "named" ? decision.key : decision.text;
  const style = ACTION_STYLE[key];
  return (
    <span className="text-sm font-medium" style={{ color: style?.color ?? "var(--gt-t2)" }}>
      {style?.label ?? key}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReplayAnalyzeCardProps {
  roundId: number;
  participants: GameSessionParticipant[];
  visibleDecisions: PersonaDecisionEvent[];
  roundResult: RoundResultEvent | null;
  isFinalRound: boolean;
  allDone: boolean;
  onProceed: () => void;
}

// ── ReplayAnalyzeCard ─────────────────────────────────────────────────────────

export function ReplayAnalyzeCard({
  roundId,
  participants,
  visibleDecisions,
  roundResult,
  isFinalRound,
  allDone,
  onProceed,
}: ReplayAnalyzeCardProps) {
  const payoffs = roundResult?.payoffs ?? {};
  const hasResult = roundResult !== null;

  const maxPayoff = hasResult ? Math.max(...Object.values(payoffs), 0) : 0;
  const winnerIds = hasResult
    ? new Set(
        Object.entries(payoffs)
          .filter(([, v]) => v === maxPayoff && maxPayoff > 0)
          .map(([id]) => Number(id)),
      )
    : new Set<number>();

  const pendingCount = participants.length - visibleDecisions.length;
  const isSettling = visibleDecisions.length === participants.length && !hasResult;

  return (
    <motion.div
      key="analyze"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-lab p-4 sm:p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 sm:mb-8">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center"
          style={{ background: "var(--gt-row-alt)", color: "var(--gt-ink)" }}
        >
          <BarChart3 size={20} />
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--gt-t1)", letterSpacing: "-0.03em" }}>
            Round Analysis
          </h2>
          <p className="text-xs" style={{ color: "var(--gt-t3)" }}>
            {hasResult
              ? `Outcome for Round ${roundId}`
              : isSettling
                ? "Calculating results..."
                : `Waiting for ${pendingCount} participant${pendingCount !== 1 ? "s" : ""}...`}
          </p>
        </div>
      </div>

      {/* Participant rows */}
      <div className="space-y-3">
        <h3
          className="text-xs font-bold uppercase mb-4"
          style={{ letterSpacing: "0.1em", color: "var(--gt-t4)" }}
        >
          Participant Outcomes
        </h3>

        {participants.map((p) => {
          const isWinner = winnerIds.has(p.personaId);
          const isHuman = p.personaId === HUMAN_PLAYER_ID;
          const decision = visibleDecisions.find(
            (d: PersonaDecisionEvent) => d.personaId === p.personaId,
          );
          const decisionDisplay = decision ? extractDecision(decision.content) : null;
          const payoff = payoffs[p.personaId];
          const seed = isHuman ? (p.userId ?? 0) : p.personaId;

          return (
            <div
              key={p.personaId}
              className="flex items-center justify-between p-3 rounded-md border transition-all duration-300"
              style={{
                background: isWinner ? "var(--gt-pos-bg)" : "var(--gt-surface)",
                borderColor: isWinner ? "hsl(125 49% 43% / 0.3)" : "var(--gt-border)",
              }}
            >
              {/* Left: identity */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {isHuman ? (
                  <User size={14} style={{ color: "var(--gt-t3)" }} />
                ) : (
                  <Cpu size={14} style={{ color: "var(--gt-t3)" }} />
                )}
                <HippyGhostAvatar seed={seed} className="size-6 rounded-full" />
                <span
                  className={`text-sm truncate ${isWinner ? "font-bold" : ""}`}
                  style={{
                    color: isWinner ? "var(--gt-t1)" : "var(--gt-t2)",
                    fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                  }}
                >
                  {p.name}
                </span>
                {!isHuman && decision?.reasoning && (
                  <ReasoningTooltip reasoning={decision.reasoning} />
                )}
                {isWinner && (
                  <span
                    className="badge-lab"
                    style={{ background: "var(--gt-pos)", color: "white", borderColor: "transparent" }}
                  >
                    WINNER
                  </span>
                )}
              </div>

              {/* Right: decision + payoff OR waiting indicator */}
              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                {decisionDisplay ? (
                  <>
                    <div className="text-right">
                      <DecisionBadge decision={decisionDisplay} />
                      <div className="text-[8px] uppercase" style={{ color: "var(--gt-t4)" }}>
                        Choice
                      </div>
                    </div>
                    {payoff !== undefined && (
                      <div className="text-right w-10 sm:w-12">
                        <div
                          className="text-xs font-bold tabular-nums"
                          style={{
                            color: isWinner ? "var(--gt-pos)" : "var(--gt-t1)",
                            fontFamily: "IBMPlexMono, monospace",
                          }}
                        >
                          +{payoff}
                        </div>
                        <div className="text-[8px] uppercase" style={{ color: "var(--gt-t4)" }}>
                          Points
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: "var(--gt-t4)", animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                    <span
                      className="text-[10px] ml-1"
                      style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
                    >
                      Deciding
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: proceed button or status */}
      {allDone ? (
        <button
          onClick={onProceed}
          className="btn-lab w-full mt-5 sm:mt-8 flex items-center justify-center gap-2 text-xl py-4"
        >
          {isFinalRound ? (
            <>FINALIZE EXPERIMENT <Trophy size={20} /></>
          ) : (
            <>PROCEED TO <span className="font-black">ROUND {roundId + 1}</span> <RefreshCw size={20} /></>
          )}
        </button>
      ) : (
        <div
          className="mt-5 sm:mt-8 text-center text-[11px] uppercase"
          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
        >
          {isSettling
            ? "Calculating results..."
            : visibleDecisions.length === participants.length
              ? "All decisions in — settling..."
              : `${visibleDecisions.length} of ${participants.length} decided`}
        </div>
      )}
    </motion.div>
  );
}
