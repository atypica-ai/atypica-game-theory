import "server-only";

import { GameSessionTimeline } from "../types";

/**
 * Format the game timeline as a text prompt for a specific player.
 *
 * Visibility rules:
 * - Game rules (timeline.system): always visible
 * - Previous rounds: all words, actions, payoffs visible; thoughts from others hidden
 * - Current round (if any): own moves visible; if simultaneousReveal=true, peers' moves hidden
 */
export function formatTimelineForPlayer(
  timeline: GameSessionTimeline,
  playerId: string,
  options: { hideCurrentRound: boolean },
): string {
  const lines: string[] = [];

  lines.push("=== GAME RULES ===");
  lines.push(timeline.system);
  lines.push("");

  const participants = timeline.meta.participants
    .map((p) => `${p.playerId === playerId ? "You" : p.name} (${p.playerId})`)
    .join(", ");
  lines.push(`Players: ${participants}`);
  lines.push("");

  if (timeline.rounds.length === 0) {
    lines.push("No rounds have been played yet. This is round 1.");
    return lines.join("\n");
  }

  // For all rounds except the current (last) round, show full info
  // For the current round, apply hideCurrentRound logic
  const currentRoundIndex = timeline.rounds.length - 1;

  timeline.rounds.forEach((round, index) => {
    const isCurrent = index === currentRoundIndex;
    lines.push(`=== ROUND ${round.roundId} ===`);
    if (round.system) {
      lines.push(round.system);
    }

    // Show each player's move for this round
    for (const [pid, record] of Object.entries(round.players)) {
      const isMe = pid === playerId;
      const participant = timeline.meta.participants.find((p) => p.playerId === pid);
      const label = isMe ? "You" : (participant?.name ?? pid);

      if (isCurrent && !isMe && options.hideCurrentRound) {
        // Hide other players' moves in the current round until all have acted
        lines.push(`${label}: [waiting for their move...]`);
        continue;
      }

      // Show words (but never other players' thoughts)
      if (record.words) {
        lines.push(`${label}: ${record.words}`);
      }
      // Show actions
      if (record.actions.length > 0) {
        const actionSummary = record.actions
          .map((a) => JSON.stringify(a, null, 0))
          .join(", ");
        lines.push(`${label}'s action: ${actionSummary}`);
      }
    }

    // Show payoffs if available (only for completed rounds)
    if (!isCurrent && Object.keys(round.payoffs).length > 0) {
      const payoffLines = Object.entries(round.payoffs).map(([pid, v]) => {
        const participant = timeline.meta.participants.find((p) => p.playerId === pid);
        const label = pid === playerId ? "You" : (participant?.name ?? pid);
        return `${label}: ${v}`;
      });
      lines.push(`Payoffs: ${payoffLines.join(" | ")}`);
    }

    lines.push("");
  });

  // Cumulative score
  const cumulative: Record<string, number> = {};
  for (const round of timeline.rounds) {
    for (const [pid, v] of Object.entries(round.payoffs)) {
      cumulative[pid] = (cumulative[pid] ?? 0) + v;
    }
  }
  if (Object.keys(cumulative).length > 0) {
    const scoreLines = Object.entries(cumulative).map(([pid, v]) => {
      const participant = timeline.meta.participants.find((p) => p.playerId === pid);
      const label = pid === playerId ? "You" : (participant?.name ?? pid);
      return `${label}: ${v}`;
    });
    lines.push(`Cumulative scores: ${scoreLines.join(" | ")}`);
  }

  return lines.join("\n");
}
