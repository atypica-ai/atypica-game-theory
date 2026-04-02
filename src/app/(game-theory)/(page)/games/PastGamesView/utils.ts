import {
  GameTimeline,
  GameSessionParticipant,
  PersonaDecisionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";

// ── Outcome ───────────────────────────────────────────────────────────────────

export interface OutcomeResult {
  isFullTie: boolean;
  winners: GameSessionParticipant[];
  scores: Record<number, number>;
}

export function computeOutcome(
  events: GameTimeline,
  participants: GameSessionParticipant[],
): OutcomeResult | null {
  if (participants.length === 0) return null;

  const scores: Record<number, number> = {};
  for (const e of events) {
    if (e.type === "round-result") {
      for (const [id, v] of Object.entries(e.payoffs)) {
        const numId = Number(id);
        scores[numId] = (scores[numId] ?? 0) + v;
      }
    }
  }

  const maxScore = Math.max(...participants.map((p) => scores[p.personaId] ?? 0));
  const leaders = participants.filter((p) => (scores[p.personaId] ?? 0) === maxScore);
  const isFullTie = leaders.length === participants.length;

  return { isFullTie, winners: isFullTie ? [] : leaders, scores };
}

// ── Behavioral summary ────────────────────────────────────────────────────────

export function computeBehavioralSummary(
  gameType: string,
  events: GameTimeline,
): string | null {
  const decisions = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision",
  );
  if (decisions.length === 0) return null;

  if (gameType === "prisoner-dilemma") {
    const coopCount = decisions.filter(
      (e) => (e.content as { action?: string }).action === "cooperate",
    ).length;
    return `${Math.round((coopCount / decisions.length) * 100)}% coop`;
  }

  if (gameType === "stag-hunt") {
    const stagCount = decisions.filter(
      (e) => (e.content as { action?: string }).action === "stag",
    ).length;
    return `${Math.round((stagCount / decisions.length) * 100)}% stag`;
  }

  if (gameType === "golden-ball") {
    const splitCount = decisions.filter(
      (e) => (e.content as { action?: string }).action === "split",
    ).length;
    return `${Math.round((splitCount / decisions.length) * 100)}% split`;
  }

  if (gameType === "beauty-contest") {
    const lastResult = events
      .filter((e): e is RoundResultEvent => e.type === "round-result")
      .at(-1);
    if (!lastResult) return null;
    const winnerId = Object.entries(lastResult.payoffs).find(([, v]) => v > 0)?.[0];
    if (!winnerId) return null;
    const winnerDecision = decisions.find((e) => e.personaId === Number(winnerId));
    if (!winnerDecision) return null;
    const num = (winnerDecision.content as { number?: number }).number;
    return num !== undefined ? `winner: ${num}` : null;
  }

  return null;
}

// ── Aggregate behavioral stat across multiple sessions ────────────────────────

export function computeAggregateLabel(
  gameType: string,
  sessions: Array<{ events: GameTimeline; status: string }>,
): string | null {
  const completed = sessions.filter((s) => s.status === "completed");
  if (completed.length === 0) return null;

  if (gameType === "prisoner-dilemma") {
    let totalDecisions = 0;
    let totalCoop = 0;
    for (const s of completed) {
      const decisions = s.events.filter(
        (e): e is PersonaDecisionEvent => e.type === "persona-decision",
      );
      totalDecisions += decisions.length;
      totalCoop += decisions.filter(
        (e) => (e.content as { action?: string }).action === "cooperate",
      ).length;
    }
    if (totalDecisions === 0) return null;
    return `avg coop: ${Math.round((totalCoop / totalDecisions) * 100)}%`;
  }

  if (gameType === "stag-hunt") {
    let total = 0;
    let stagTotal = 0;
    for (const s of completed) {
      const decisions = s.events.filter(
        (e): e is PersonaDecisionEvent => e.type === "persona-decision",
      );
      total += decisions.length;
      stagTotal += decisions.filter(
        (e) => (e.content as { action?: string }).action === "stag",
      ).length;
    }
    if (total === 0) return null;
    return `avg stag: ${Math.round((stagTotal / total) * 100)}%`;
  }

  if (gameType === "golden-ball") {
    let total = 0;
    let splitTotal = 0;
    for (const s of completed) {
      const decisions = s.events.filter(
        (e): e is PersonaDecisionEvent => e.type === "persona-decision",
      );
      total += decisions.length;
      splitTotal += decisions.filter(
        (e) => (e.content as { action?: string }).action === "split",
      ).length;
    }
    if (total === 0) return null;
    return `avg split: ${Math.round((splitTotal / total) * 100)}%`;
  }

  if (gameType === "beauty-contest") {
    const winningNums: number[] = [];
    for (const s of completed) {
      const decisions = s.events.filter(
        (e): e is PersonaDecisionEvent => e.type === "persona-decision",
      );
      const lastResult = s.events
        .filter((e): e is RoundResultEvent => e.type === "round-result")
        .at(-1);
      if (!lastResult) continue;
      const winnerId = Object.entries(lastResult.payoffs).find(([, v]) => v > 0)?.[0];
      if (!winnerId) continue;
      const winnerDecision = decisions.find((e) => e.personaId === Number(winnerId));
      if (!winnerDecision) continue;
      const num = (winnerDecision.content as { number?: number }).number;
      if (num !== undefined) winningNums.push(num);
    }
    if (winningNums.length === 0) return null;
    const avg = Math.round(winningNums.reduce((a, b) => a + b, 0) / winningNums.length);
    return `avg winner: ${avg}`;
  }

  return null;
}

// ── Date formatting ───────────────────────────────────────────────────────────

export function formatDateShort(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateFull(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
