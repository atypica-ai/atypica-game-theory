import "server-only";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "../types";

// ── Shared helpers ───────────────────────────────────────────────────────────

function labelFor(personaId: number, viewerPersonaId: number, participants: GameSessionParticipant[]): string {
  if (personaId === viewerPersonaId) return "You";
  return participants.find((p) => p.personaId === personaId)?.name ?? `Player ${personaId}`;
}

function renderDecision(event: PersonaDecisionEvent, label: string): string {
  return `${label}'s decision: ${JSON.stringify(event.content)}`;
}

function renderDiscussion(event: PersonaDiscussionEvent, label: string): string {
  return `${label}: ${event.content}`;
}

function cumulativeScores(
  resultEvents: RoundResultEvent[],
  participants: GameSessionParticipant[],
  viewerPersonaId: number,
): string {
  const totals: Record<number, number> = {};
  for (const e of resultEvents) {
    for (const [id, v] of Object.entries(e.payoffs)) {
      const numId = Number(id);
      totals[numId] = (totals[numId] ?? 0) + v;
    }
  }
  if (Object.keys(totals).length === 0) return "";
  const parts = Object.entries(totals).map(([id, v]) => {
    const label = labelFor(Number(id), viewerPersonaId, participants);
    return `${label}: ${v}`;
  });
  return `Cumulative scores: ${parts.join(" | ")}`;
}

// ── Discussion phase formatter ───────────────────────────────────────────────

/**
 * Format timeline for a player during the discussion phase of a round.
 *
 * Visibility:
 * - All system events
 * - All persona-discussion events across ALL rounds (full cross-round memory)
 *   — own reasoning visible, others' reasoning hidden
 * - All persona-decision events from PREVIOUS rounds
 *   — own reasoning visible, others' reasoning hidden
 * - No current-round decisions yet (they haven't been made)
 */
export function formatTimelineForDiscussion(
  timeline: GameTimeline,
  viewerPersonaId: number,
  participants: GameSessionParticipant[],
  currentRound: number,
): string {
  const lines: string[] = [];

  for (const event of timeline) {
    switch (event.type) {
      case "system":
        lines.push(event.content);
        lines.push("");
        break;

      case "persona-discussion": {
        const label = labelFor(event.personaId, viewerPersonaId, participants);
        if (event.reasoning && event.personaId === viewerPersonaId) {
          lines.push(`[Your reasoning] ${event.reasoning}`);
        }
        lines.push(`[Round ${event.round} discussion] ${renderDiscussion(event, label)}`);
        lines.push("");
        break;
      }

      case "persona-decision": {
        // Only include decisions from previous rounds
        if (event.round >= currentRound) break;
        const label = labelFor(event.personaId, viewerPersonaId, participants);
        if (event.reasoning && event.personaId === viewerPersonaId) {
          lines.push(`[Your reasoning] ${event.reasoning}`);
        }
        lines.push(`[Round ${event.round}] ${renderDecision(event, label)}`);
        lines.push("");
        break;
      }

      case "round-result": {
        if (event.round >= currentRound) break;
        const parts = Object.entries(event.payoffs).map(([id, v]) => {
          const label = labelFor(Number(id), viewerPersonaId, participants);
          return `${label}: ${v}`;
        });
        lines.push(`[Round ${event.round} payoffs] ${parts.join(" | ")}`);
        lines.push("");
        break;
      }
    }
  }

  // Cumulative scores from all completed rounds
  const resultEvents = timeline.filter(
    (e): e is RoundResultEvent => e.type === "round-result" && e.round < currentRound,
  );
  const scores = cumulativeScores(resultEvents, participants, viewerPersonaId);
  if (scores) {
    lines.push(scores);
    lines.push("");
  }

  return lines.join("\n").trim();
}

// ── Decision phase formatter ─────────────────────────────────────────────────

/**
 * Format timeline for a player during the decision phase of a round.
 *
 * Visibility:
 * - All system events
 * - All persona-discussion events from all rounds (including current)
 *   — others' reasoning always hidden
 * - All persona-decision events from previous rounds — others' reasoning hidden
 * - Current-round decisions: if simultaneousReveal=true, only own decision visible;
 *   otherwise all current-round decisions visible
 */
export function formatTimelineForDecision(
  timeline: GameTimeline,
  viewerPersonaId: number,
  participants: GameSessionParticipant[],
  currentRound: number,
  simultaneousReveal: boolean,
): string {
  const lines: string[] = [];

  for (const event of timeline) {
    switch (event.type) {
      case "system":
        lines.push(event.content);
        lines.push("");
        break;

      case "persona-discussion": {
        const label = labelFor(event.personaId, viewerPersonaId, participants);
        // Never show others' reasoning
        if (event.reasoning && event.personaId === viewerPersonaId) {
          lines.push(`[Your reasoning] ${event.reasoning}`);
        }
        lines.push(`[Round ${event.round} discussion] ${renderDiscussion(event, label)}`);
        lines.push("");
        break;
      }

      case "persona-decision": {
        const label = labelFor(event.personaId, viewerPersonaId, participants);
        const isCurrentRound = event.round === currentRound;
        const isOtherPlayer = event.personaId !== viewerPersonaId;

        // Hide other players' current-round decisions when simultaneousReveal is on
        if (isCurrentRound && isOtherPlayer && simultaneousReveal) {
          lines.push(`[Round ${event.round}] ${label}: [decision pending...]`);
          lines.push("");
          break;
        }

        // Never show others' reasoning
        if (event.reasoning && event.personaId === viewerPersonaId) {
          lines.push(`[Your reasoning] ${event.reasoning}`);
        }
        lines.push(`[Round ${event.round}] ${renderDecision(event, label)}`);
        lines.push("");
        break;
      }

      case "round-result": {
        if (event.round >= currentRound) break;
        const parts = Object.entries(event.payoffs).map(([id, v]) => {
          const label = labelFor(Number(id), viewerPersonaId, participants);
          return `${label}: ${v}`;
        });
        lines.push(`[Round ${event.round} payoffs] ${parts.join(" | ")}`);
        lines.push("");
        break;
      }
    }
  }

  // Cumulative scores from all completed rounds
  const resultEvents = timeline.filter(
    (e): e is RoundResultEvent => e.type === "round-result" && e.round < currentRound,
  );
  const scores = cumulativeScores(resultEvents, participants, viewerPersonaId);
  if (scores) {
    lines.push(scores);
    lines.push("");
  }

  return lines.join("\n").trim();
}
