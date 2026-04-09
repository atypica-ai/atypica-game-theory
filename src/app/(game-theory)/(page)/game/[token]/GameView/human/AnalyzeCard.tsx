"use client";

import {
  GameSessionParticipant,
  HUMAN_PLAYER_ID,
  PersonaDecisionEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { BarChart3, Cpu, RefreshCw, Trophy, User } from "lucide-react";
import { motion } from "motion/react";
import type { RoundData } from "../index";

// ── Decision display ─────────────────────────────────────────────────────────

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

const ACTION_LABELS: Record<string, string> = {
  cooperate: "Cooperate",
  defect: "Defect",
  stag: "Stag",
  rabbit: "Rabbit",
  split: "Split",
  steal: "Steal",
  volunteer: "Volunteer",
  abstain: "Abstain",
  pull: "Pull",
  stay: "Stay",
};

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
  return (
    <span className="text-sm font-medium" style={{ color: "var(--gt-t2)" }}>
      {ACTION_LABELS[key] ?? key}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AnalyzeCardProps {
  roundId: number;
  roundData: RoundData;
  participants: GameSessionParticipant[];
  isFinalRound: boolean;
  onProceed: () => void;
}

// ── AnalyzeCard ───────────────────────────────────────────────────────────────

export function AnalyzeCard({
  roundId,
  roundData,
  participants,
  isFinalRound,
  onProceed,
}: AnalyzeCardProps) {
  const payoffs = roundData.result?.payoffs ?? {};

  // Find round winner(s) — participant(s) with highest payoff
  const maxPayoff = Math.max(...Object.values(payoffs), 0);
  const winnerIds = new Set(
    Object.entries(payoffs)
      .filter(([, v]) => v === maxPayoff && maxPayoff > 0)
      .map(([id]) => Number(id)),
  );

  return (
    <motion.div
      key="analyze"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-lab p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center"
          style={{ background: "var(--gt-row-alt)", color: "var(--gt-blue)" }}
        >
          <BarChart3 size={20} />
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--gt-t1)", letterSpacing: "-0.03em" }}>
            Round Analysis
          </h2>
          <p className="text-xs" style={{ color: "var(--gt-t3)" }}>
            Outcome for Round {roundId}
          </p>
        </div>
      </div>

      {/* Participant outcomes */}
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
          const payoff = payoffs[p.personaId] ?? 0;
          const decision = roundData.decisions.find(
            (d: PersonaDecisionEvent) => d.personaId === p.personaId,
          );
          const decisionDisplay = decision ? extractDecision(decision.content) : null;
          const seed = isHuman ? (p.userId ?? 0) : p.personaId;

          return (
            <div
              key={p.personaId}
              className="flex items-center justify-between p-3 rounded-md border"
              style={{
                background: isWinner ? "var(--gt-pos-bg)" : "var(--gt-surface)",
                borderColor: isWinner ? "hsl(125 49% 43% / 0.3)" : "var(--gt-border)",
              }}
            >
              <div className="flex items-center gap-3">
                {isHuman ? (
                  <User size={14} style={{ color: "var(--gt-t3)" }} />
                ) : (
                  <Cpu size={14} style={{ color: "var(--gt-t3)" }} />
                )}
                <HippyGhostAvatar seed={seed} className="size-6 rounded-full" />
                <span
                  className={`text-sm ${isWinner ? "font-bold" : ""}`}
                  style={{
                    color: isWinner ? "var(--gt-t1)" : "var(--gt-t2)",
                    fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                  }}
                >
                  {p.name}
                </span>
                {isWinner && (
                  <span
                    className="badge-lab"
                    style={{
                      background: "var(--gt-pos)",
                      color: "white",
                      borderColor: "transparent",
                    }}
                  >
                    WINNER
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6">
                {decisionDisplay && (
                  <div className="text-right">
                    <DecisionBadge decision={decisionDisplay} />
                    <div
                      className="text-[8px] uppercase"
                      style={{ color: "var(--gt-t4)" }}
                    >
                      Choice
                    </div>
                  </div>
                )}
                <div className="text-right w-12">
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Proceed button */}
      <button onClick={onProceed} className="btn-lab w-full mt-8 flex items-center justify-center gap-2 text-xl py-4">
        {isFinalRound ? (
          <>
            VIEW FINAL RESULTS <Trophy size={20} />
          </>
        ) : (
          <>
            PROCEED TO <span className="font-black">ROUND {roundId + 1}</span>{" "}
            <RefreshCw size={20} />
          </>
        )}
      </button>
    </motion.div>
  );
}
