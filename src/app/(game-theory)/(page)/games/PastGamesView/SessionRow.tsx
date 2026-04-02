"use client";

import { SessionListItem } from "@/app/(game-theory)/actions";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import Link from "next/link";
import { computeOutcome, computeBehavioralSummary, formatDateShort } from "./utils";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { color, bg, label } = (() => {
    if (status === "completed")
      return { color: "var(--gt-pos)", bg: "var(--gt-pos-bg)", label: "Completed" };
    if (status === "running")
      return { color: "var(--gt-blue)", bg: "var(--gt-blue-bg)", label: "Running" };
    if (status === "failed")
      return { color: "var(--gt-neg)", bg: "var(--gt-neg-bg)", label: "Failed" };
    return { color: "var(--gt-t3)", bg: "transparent", label: status };
  })();

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-[500]"
      style={{
        borderRadius: "9999px",
        color,
        background: bg,
        border: `1px solid ${color}40`,
        fontFamily: "IBMPlexMono, monospace",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ── Participant chip ──────────────────────────────────────────────────────────

function ParticipantChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px]"
      style={{
        borderRadius: "9999px",
        border: "1px solid var(--gt-border-md)",
        color: "var(--gt-t2)",
        background: "var(--gt-bg)",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
}

// ── Outcome cell ──────────────────────────────────────────────────────────────

function OutcomeCell({
  participants,
  winners,
  scores,
  isFullTie,
}: {
  participants: GameSessionParticipant[];
  winners: GameSessionParticipant[];
  scores: Record<number, number>;
  isFullTie: boolean;
}) {
  if (isFullTie) {
    return (
      <span className="text-[13px] font-[500]" style={{ color: "var(--gt-warn)" }}>
        Tie
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {participants.map((p) => {
        const isWinner = winners.some((w) => w.personaId === p.personaId);
        const score = scores[p.personaId] ?? 0;
        return (
          <div key={p.personaId} className="flex items-center gap-1.5">
            <span
              className="text-[12px]"
              style={{
                color: isWinner ? "var(--gt-pos)" : "var(--gt-t3)",
                fontFamily: "IBMPlexMono, monospace",
                fontWeight: isWinner ? 500 : 400,
              }}
            >
              {score}
            </span>
            <span
              className="text-[12px]"
              style={{
                color: isWinner ? "var(--gt-t1)" : "var(--gt-t3)",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
            </span>
            {isWinner && (
              <span className="text-[10px]" style={{ color: "var(--gt-pos)" }}>
                ↑
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Session row ───────────────────────────────────────────────────────────────

export function SessionRow({ session }: { session: SessionListItem }) {
  const { token, gameType, status, events, extra, createdAt } = session;
  const participants = extra.participants ?? [];

  const behavioralSummary =
    status === "completed" ? computeBehavioralSummary(gameType, events) : null;

  const outcome = status === "completed" ? computeOutcome(events, participants) : null;

  const hasError = !!extra.error;

  return (
    <tr
      className="group border-b"
      style={{ borderColor: "var(--gt-border)" }}
    >
      {/* Date */}
      <td className="py-3 pr-4 align-top">
        <span
          className="text-[12px]"
          style={{
            color: "var(--gt-t3)",
            fontFamily: "IBMPlexMono, monospace",
            whiteSpace: "nowrap",
          }}
        >
          {formatDateShort(createdAt)}
        </span>
      </td>

      {/* Participants */}
      <td className="py-3 pr-6 align-top">
        <div className="flex flex-wrap gap-1">
          {participants.length > 0 ? (
            participants.map((p) => <ParticipantChip key={p.personaId} name={p.name} />)
          ) : (
            <span className="text-[12px]" style={{ color: "var(--gt-t4)" }}>
              —
            </span>
          )}
        </div>
      </td>

      {/* Behavioral metric */}
      <td className="py-3 pr-6 align-top">
        {behavioralSummary ? (
          <span
            className="text-[13px] font-[500]"
            style={{
              color: "var(--gt-t2)",
              fontFamily: "IBMPlexMono, monospace",
            }}
          >
            {behavioralSummary}
          </span>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--gt-t4)" }}>
            {hasError ? "error" : "—"}
          </span>
        )}
      </td>

      {/* Outcome */}
      <td className="py-3 pr-6 align-top">
        {outcome ? (
          <OutcomeCell
            participants={participants}
            winners={outcome.winners}
            scores={outcome.scores}
            isFullTie={outcome.isFullTie}
          />
        ) : (
          <span className="text-[12px]" style={{ color: "var(--gt-t4)" }}>
            —
          </span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 pr-6 align-top">
        <StatusBadge status={status} />
      </td>

      {/* View link */}
      <td className="py-3 align-top text-right">
        <Link
          href={`/game/${token}`}
          className="text-[13px] font-[500] transition-opacity hover:opacity-70"
          style={{ color: "var(--gt-blue)" }}
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
