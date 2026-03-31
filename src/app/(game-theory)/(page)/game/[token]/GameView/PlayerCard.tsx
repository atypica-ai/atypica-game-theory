"use client";

import {
  GameSessionParticipant,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";

// ── Player color palette — works on warm white surfaces ───────────────────────
export const PLAYER_COLORS = [
  "hsl(208 77% 42%)",  // deep blue
  "hsl(350 60% 48%)",  // merlot
  "hsl(152 55% 36%)",  // forest green
  "hsl(35 80% 50%)",   // amber
  "hsl(270 55% 48%)",  // purple
  "hsl(180 55% 36%)",  // teal
  "hsl(12 70% 50%)",   // coral
  "hsl(80 45% 38%)",   // olive
  "hsl(220 50% 52%)",  // periwinkle
  "hsl(320 55% 48%)",  // magenta
];

// ── Action badge styles — pills, semantic colors ──────────────────────────────
export const ACTION_STYLE: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  cooperate: {
    color: "var(--gt-pos)",
    bg: "var(--gt-pos-bg)",
    border: "hsl(125 49% 43% / 0.25)",
    label: "Cooperate",
  },
  defect: {
    color: "var(--gt-neg)",
    bg: "var(--gt-neg-bg)",
    border: "hsl(2 63% 54% / 0.25)",
    label: "Defect",
  },
  stag: {
    color: "var(--gt-blue)",
    bg: "var(--gt-blue-bg)",
    border: "var(--gt-blue-border)",
    label: "Stag",
  },
  rabbit: {
    color: "var(--gt-warn)",
    bg: "var(--gt-warn-bg)",
    border: "hsl(48 93% 45% / 0.3)",
    label: "Rabbit",
  },
};

export type PlayerResultState = "winner" | "loser" | "tie";

// ── Action pill ───────────────────────────────────────────────────────────────
export function ActionPill({ actionKey }: { actionKey: string }) {
  const style = ACTION_STYLE[actionKey];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap"
      style={
        style
          ? {
              borderRadius: "9999px",
              border: `1px solid ${style.border}`,
              background: style.bg,
              color: style.color,
            }
          : {
              borderRadius: "9999px",
              border: "1px solid var(--gt-border-md)",
              background: "transparent",
              color: "var(--gt-t3)",
            }
      }
    >
      {style?.label ?? actionKey ?? "—"}
    </span>
  );
}

// ── Scoreboard row — leaderboard table row ────────────────────────────────────

interface ScoreboardRowProps {
  participant: GameSessionParticipant;
  playerIndex: number;
  score: number;
  rank: number;
  roundActions: Array<{ roundId: number; actionKey: string; payoff: number | null }>;
  resultState?: PlayerResultState;
  onClick: () => void;
}

export function ScoreboardRow({
  participant,
  playerIndex,
  score,
  rank,
  roundActions,
  resultState,
  onClick,
}: ScoreboardRowProps) {
  const color = PLAYER_COLORS[playerIndex] ?? PLAYER_COLORS[0];
  const isWinner = resultState === "winner";
  const isLoser = resultState === "loser";

  return (
    <tr
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-colors duration-150",
        rank % 2 === 0 ? "bg-[var(--gt-row-alt)]" : "bg-[var(--gt-surface)]",
        "hover:bg-[hsl(208_77%_52%_/_0.04)]",
        isLoser && "opacity-50",
      )}
    >
      {/* Rank */}
      <td className="w-10 pl-6 pr-3 py-4 text-right tabular-nums text-[13px] text-[var(--gt-t4)]">
        {rank}
      </td>

      {/* Player */}
      <td className="py-4 pr-6">
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 rounded-full p-[2px]"
            style={{ outline: isWinner ? `2px solid ${color}` : undefined, outlineOffset: 1 }}
          >
            <HippyGhostAvatar seed={participant.personaId} className="size-7 rounded-full" />
          </div>
          <span
            className="text-[14px] font-[500] truncate"
            style={{ color: isWinner ? color : "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {participant.name}
          </span>
        </div>
      </td>

      {/* Per-round action + payoff */}
      {roundActions.map(({ roundId, actionKey, payoff }) => (
        <td key={roundId} className="py-4 px-4">
          <div className="flex items-center gap-2">
            {actionKey ? <ActionPill actionKey={actionKey} /> : <span className="text-[var(--gt-t4)] text-[13px]">—</span>}
            {payoff !== null && (
              <span
                className="text-[13px] tabular-nums"
                style={{ color: payoff >= 0 ? "var(--gt-pos)" : "var(--gt-neg)" }}
              >
                {payoff > 0 ? "+" : ""}{payoff}
              </span>
            )}
          </div>
        </td>
      ))}

      {/* Total score */}
      <td className="py-4 pl-4 pr-6 text-right">
        <span
          className="text-[17px] font-[600] tabular-nums"
          style={{
            color,
            letterSpacing: "var(--gt-tracking-tight)",
          }}
        >
          {score}
        </span>
      </td>
    </tr>
  );
}

// ── Participant tile — video-conference style strip ───────────────────────────

export interface ParticipantTileProps {
  participant: GameSessionParticipant;
  playerIndex: number;
  score: number;
  actionKey?: string;
  isDeliberating?: boolean;
  resultState?: PlayerResultState;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ParticipantTile({
  participant,
  playerIndex,
  score,
  actionKey,
  isDeliberating,
  resultState,
  isSelected,
  onClick,
}: ParticipantTileProps) {
  const color = PLAYER_COLORS[playerIndex] ?? PLAYER_COLORS[0];
  const isWinner = resultState === "winner";
  const isLoser = resultState === "loser";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center text-center shrink-0 overflow-hidden transition-all duration-150",
        isLoser ? "opacity-40" : "opacity-100",
      )}
      style={{
        background: "var(--gt-surface)",
        border: `1px solid ${isSelected ? color : "var(--gt-border)"}`,
        borderRadius: "0.5rem",
        width: "110px",
        outline: isSelected ? `2px solid ${color}` : undefined,
        outlineOffset: isSelected ? "2px" : undefined,
      }}
    >
      {/* Top color strip */}
      <div className="w-full h-[3px] shrink-0" style={{ backgroundColor: color }} />

      <div className="flex flex-col items-center gap-1.5 px-3 py-3 w-full">
        {/* Avatar */}
        <div
          className="rounded-full"
          style={{
            outline: isWinner ? `2px solid ${color}` : undefined,
            outlineOffset: isWinner ? 2 : undefined,
          }}
        >
          <HippyGhostAvatar seed={participant.personaId} className="size-10 rounded-full" />
        </div>

        {/* Name */}
        <span
          className="text-[11px] font-[500] w-full truncate leading-tight"
          style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          {participant.name}
        </span>

        {/* Score */}
        <span
          className="text-[18px] font-[600] tabular-nums leading-none"
          style={{ color, letterSpacing: "var(--gt-tracking-tight)" }}
        >
          {score}
        </span>

        {/* Status / Action */}
        <div className="h-5 flex items-center justify-center">
          {isDeliberating ? (
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full animate-pulse"
                  style={{ backgroundColor: color, animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          ) : actionKey ? (
            <ActionPill actionKey={actionKey} />
          ) : (
            <span
              className="text-[11px]"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
            >
              —
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── PlayerCard2 — for replay arena grid ───────────────────────────────────────

interface PlayerCard2Props {
  personaId: number;
  personaName: string;
  playerIndex: number;
  decision: PersonaDecisionEvent | null | undefined;
  lastDiscussion: PersonaDiscussionEvent | null | undefined;
  payoff: number | undefined;
  cumulativeScore: number;
  isCurrentRound: boolean;
  resultState?: PlayerResultState;
  onClick: () => void;
}

export function PlayerCard2({
  personaId,
  personaName,
  playerIndex,
  decision,
  lastDiscussion,
  payoff,
  cumulativeScore,
  isCurrentRound,
  resultState,
  onClick,
}: PlayerCard2Props) {
  const color = PLAYER_COLORS[playerIndex] ?? PLAYER_COLORS[0];
  const isWinner = resultState === "winner";
  const isLoser = resultState === "loser";

  const actionKey = (decision?.content as Record<string, string> | undefined)?.action ?? "";
  const hasDecided = !!decision;
  const hasDiscussed = !!lastDiscussion;

  const statusState: "deliberating" | "discussing" | "decided" | "idle" = hasDecided
    ? "decided"
    : isCurrentRound && hasDiscussed
      ? "discussing"
      : isCurrentRound
        ? "deliberating"
        : "idle";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col bg-[var(--gt-surface)] border border-[var(--gt-border)] text-left",
        "transition-colors duration-150 hover:border-[var(--gt-border-md)] group overflow-hidden",
        isLoser && "opacity-40",
      )}
      style={{ borderRadius: "0.375rem" }}
    >
      {/* Top color strip */}
      <div className="h-[3px] w-full" style={{ backgroundColor: color }} />

      <div className="flex flex-col flex-1 p-4 gap-0">
        {/* Identity */}
        <div className="flex items-center gap-2.5 mb-3">
          <HippyGhostAvatar seed={personaId} className="size-7 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] font-[600] truncate leading-tight"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              {personaName}
            </div>
            {isWinner && (
              <div className="text-[11px] mt-0.5" style={{ color: "var(--gt-pos)" }}>
                Winner
              </div>
            )}
            {resultState === "tie" && (
              <div className="text-[11px] mt-0.5" style={{ color: "var(--gt-warn)" }}>
                Tie
              </div>
            )}
          </div>
        </div>

        {/* Score — hero element */}
        <div className="flex-1 flex items-center justify-center py-2">
          <span
            className="font-[600] tabular-nums leading-none select-none"
            style={{
              color,
              fontSize: isWinner ? "3rem" : "2.5rem",
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          >
            {cumulativeScore}
          </span>
        </div>

        {/* Status strip */}
        <div className="h-7 flex items-center">
          {statusState === "deliberating" && (
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] font-[500]" style={{ color: "var(--gt-t3)" }}>
                Deliberating…
              </span>
            </div>
          )}
          {statusState === "discussing" && (
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span
                className="text-[11px] font-[500] shrink-0"
                style={{ color: "var(--gt-warn)" }}
              >
                Speaking
              </span>
              <span className="text-[11px] text-[var(--gt-t4)] truncate italic">
                {lastDiscussion!.content}
              </span>
            </div>
          )}
          {statusState === "decided" && (
            <div className="flex items-center justify-between gap-2 w-full">
              <ActionPill actionKey={actionKey} />
              {payoff !== undefined && (
                <span
                  className="text-[13px] font-[600] tabular-nums"
                  style={{ color: payoff >= 0 ? "var(--gt-pos)" : "var(--gt-neg)" }}
                >
                  {payoff > 0 ? "+" : ""}{payoff}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
